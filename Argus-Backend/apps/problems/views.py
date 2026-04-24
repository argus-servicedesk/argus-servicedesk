"""
Problem views — full CRUD + stats + work-notes + AI-RCA endpoint.

URL layout (registered in urls.py):
  GET    /problems/                  → list
  POST   /problems/                  → create
  GET    /problems/stats/            → aggregate stats + KEDB
  GET    /problems/<uuid>/           → detail
  PATCH  /problems/<uuid>/           → update (partial)
  POST   /problems/<uuid>/notes/     → add work note
  POST   /problems/<uuid>/ai-rca/    → trigger AI root-cause analysis
  PATCH  /problems/<uuid>/rca/       → apply RCA fields (root_cause + workaround)
"""

from __future__ import annotations

import logging

from django.db.models import Count, Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from apps.changes.models import Change
from apps.common.mixins import OrgQuerysetMixin
from apps.common.pagination import DefaultPagination
from apps.common.responses import failure, success
from apps.incidents.models import Activity, Incident, IncidentProblem, WorkNote

from .models import Problem
from .serializers import (
    ProblemCreateSerializer,
    ProblemSerializer,
    ProblemUpdateSerializer,
    WorkNoteCreateSerializer,
)
from .services import ProblemService

logger = logging.getLogger(__name__)


# ─── Mixins ───────────────────────────────────────────────────────────────────

class OrgScopedMixin:
    """Restrict every queryset to the current organisation.
    """

    def _organization(self):
        return getattr(self.request, "organization", None)


# ─── List / Create ────────────────────────────────────────────────────────────

class ProblemListCreateView(OrgQuerysetMixin, OrgScopedMixin, generics.ListCreateAPIView):
    """
    GET  /problems/   — paginated list with search + filter
    POST /problems/   — create new problem
    """

    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["state", "priority", "category", "assigned_to"]
    pagination_class = DefaultPagination
    queryset = Problem.objects.all()

    def get_queryset(self):
        organization = self._organization()
        if organization is None:
            return Problem.objects.none()

        qs = (
            super().get_queryset()
            .select_related(
                "assigned_to",
                "created_by",
                "assignment_group",
                "related_change",
                "organization",
            )
            .prefetch_related("linked_incidents__incident", "work_notes__author")
            .order_by("-created_at")
        )

        search = self.request.query_params.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(number__icontains=search)
                | Q(short_description__icontains=search)
                | Q(description__icontains=search)
            )

        return qs

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProblemCreateSerializer
        return ProblemSerializer

    def list(self, request, *args, **kwargs):
        try:
            if self._organization() is None:
                return failure("Organisation context required.", status_code=400)
            qs = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(qs)
            if page is not None:
                serializer = ProblemSerializer(page, many=True)
                return self.get_paginated_response(serializer.data)
            serializer = ProblemSerializer(qs, many=True)
            return success(serializer.data)
        except Exception:
            logger.exception("Error listing problems")
            return failure("Failed to retrieve problems.", status_code=500)

    def create(self, request, *args, **kwargs):
        try:
            if self._organization() is None:
                return failure("Organisation context required.", status_code=400)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            problem = serializer.save()
            return success(
                ProblemSerializer(problem).data, "Problem created successfully.", 201
            )
        except ValidationError as exc:
            return failure("Validation failed.", errors=exc.detail, status_code=400)
        except Exception:
            logger.exception("Error creating problem")
            return failure("Failed to create problem.", status_code=400)


# ─── Detail / Update ──────────────────────────────────────────────────────────

class ProblemDetailView(OrgQuerysetMixin, OrgScopedMixin, generics.RetrieveUpdateAPIView):
    """
    GET   /problems/<uuid>/  — full detail
    PATCH /problems/<uuid>/  — partial update (state transitions validated)
    """

    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "patch", "head", "options"]
    queryset = Problem.objects.all()

    def get_queryset(self):
        organization = self._organization()
        if organization is None:
            return Problem.objects.none()
        return (
            super().get_queryset()
            .select_related(
                "assigned_to",
                "created_by",
                "assignment_group",
                "related_change",
                "organization",
            )
            .prefetch_related("linked_incidents__incident", "work_notes__author")
        )

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return ProblemUpdateSerializer
        return ProblemSerializer

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            return success(ProblemSerializer(instance).data)
        except Exception:
            logger.exception("Error retrieving problem %s", kwargs.get("pk"))
            return failure("Problem not found.", status_code=404)

    def partial_update(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
            serializer = ProblemUpdateSerializer(
                instance, data=request.data, partial=True
            )
            serializer.is_valid(raise_exception=True)
            problem = serializer.save()
            return success(
                ProblemSerializer(problem).data, "Problem updated successfully."
            )
        except ValidationError as exc:
            return failure("Validation failed.", errors=exc.detail, status_code=400)
        except Exception:
            logger.exception("Error updating problem %s", kwargs.get("pk"))
            return failure("Failed to update problem.", status_code=400)


# ─── Stats ────────────────────────────────────────────────────────────────────

class ProblemStatsView(OrgScopedMixin, APIView):
    """
    GET /problems/stats/

    Returns:
      - stateCounts  : { NEW: n, INVESTIGATION: n, … }
      - priorityCounts: { P1: n, … }
      - total        : int
      - knownErrors  : lightweight list of KNOWN_ERROR problems (for KEDB widget)
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        organization = self._organization()
        if organization is None:
            return failure("Organisation context required.", status_code=400)

        try:
            qs = Problem.objects.filter(organization=organization)

            # Aggregate state counts in a single query
            state_rows = qs.values("state").annotate(n=Count("id"))
            state_counts = {row["state"]: row["n"] for row in state_rows}

            # Aggregate priority counts
            priority_rows = qs.values("priority").annotate(n=Count("id"))
            priority_counts = {row["priority"]: row["n"] for row in priority_rows}

            # Known Error Database entries (lightweight)
            known_errors = list(
                qs.filter(state=Problem.State.KNOWN_ERROR)
                .values(
                    "id",
                    "number",
                    "priority",
                    "category",
                    "short_description",
                    "workaround",
                    "updated_at",
                    "created_at",
                )
                .order_by("-created_at")[:50]
            )
            # Stringify UUIDs for JSON serialisation
            for ke in known_errors:
                ke["id"] = str(ke["id"])
                updated_at = ke.pop("updated_at", None)
                created_at = ke.pop("created_at", None)
                stamp = updated_at or created_at
                ke["updatedAt"] = stamp.isoformat() if stamp else None

            return success(
                {
                    "total": qs.count(),
                    "stateCounts": state_counts,
                    "priorityCounts": priority_counts,
                    "knownErrors": known_errors,
                }
            )
        except Exception:
            logger.exception("Error computing problem stats")
            return failure("Failed to retrieve statistics.", status_code=500)


# ─── Work Notes ───────────────────────────────────────────────────────────────

class ProblemWorkNoteView(OrgScopedMixin, APIView):
    """
    POST /problems/<uuid>/notes/
    Adds a WorkNote (from incidents.WorkNote) linked to this problem.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organization = self._organization()
        if organization is None:
            return failure("Organisation context required.", status_code=400)

        problem = Problem.objects.filter(id=pk, organization=organization).first()
        if not problem:
            return failure("Problem not found.", status_code=404)

        serializer = WorkNoteCreateSerializer(data=request.data)
        if not serializer.is_valid():
            return failure(serializer.errors, status_code=400)

        note = WorkNote.objects.create(
            problem=problem,
            author=request.user,
            content=serializer.validated_data["content"],
            is_internal=serializer.validated_data.get("is_internal", False),
            source=WorkNote.Source.MANUAL,
        )

        return success(
            {
                "id": str(note.id),
                "content": note.content,
                "is_internal": note.is_internal,
                "author": {
                    "id": str(request.user.id),
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                    "email": request.user.email,
                },
                "source": note.source,
                "created_at": note.created_at.isoformat(),
            },
            "Work note added.",
            201,
        )


# ─── AI RCA ───────────────────────────────────────────────────────────────────

class ProblemIncidentLinkView(OrgScopedMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organization = self._organization()
        if organization is None:
            return failure("Organisation context required.", status_code=400)

        problem = Problem.objects.filter(id=pk, organization=organization).first()
        if not problem:
            return failure("Problem not found.", status_code=404)

        incident_id = request.data.get("incident_id") or request.data.get("incidentId")
        if not incident_id:
            return failure("incident_id is required", status_code=400)

        incident = Incident.objects.filter(id=incident_id, organization=organization).first()
        if not incident:
            return failure("Incident not found.", status_code=404)

        link_type = request.data.get("link_type") or request.data.get("linkType") or IncidentProblem.LinkType.RELATED
        if link_type not in IncidentProblem.LinkType.values:
            return failure("Invalid link type.", status_code=400)

        notes = request.data.get("notes")
        link, created = IncidentProblem.objects.get_or_create(
            incident=incident,
            problem=problem,
            defaults={"link_type": link_type, "notes": notes},
        )
        if not created:
            changed = False
            if link.link_type != link_type:
                link.link_type = link_type
                changed = True
            if notes is not None and link.notes != notes:
                link.notes = notes
                changed = True
            if changed:
                link.save(update_fields=["link_type", "notes"])

        Activity.objects.create(
            action="INCIDENT_LINKED",
            description=f"Linked incident {incident.number}",
            user=request.user,
            incident=incident,
            problem=problem,
        )

        problem = (
            Problem.objects.filter(id=problem.id)
            .select_related(
                "assigned_to",
                "created_by",
                "assignment_group",
                "related_change",
                "organization",
            )
            .prefetch_related("linked_incidents__incident", "work_notes__author")
            .first()
        )
        return success(
            ProblemSerializer(problem).data,
            "incident linked to problem" if created else "problem incident link updated",
            201 if created else 200,
        )


class ProblemChangeLinkView(OrgScopedMixin, APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organization = self._organization()
        if organization is None:
            return failure("Organisation context required.", status_code=400)

        problem = Problem.objects.filter(id=pk, organization=organization).first()
        if not problem:
            return failure("Problem not found.", status_code=404)

        change_id = request.data.get("change_id") or request.data.get("changeId")
        if not change_id:
            return failure("change_id is required", status_code=400)

        change = Change.objects.filter(id=change_id, organization=organization).first()
        if not change:
            return failure("Change not found.", status_code=404)

        if problem.related_change_id != change.id:
            problem.related_change = change
            problem.save(update_fields=["related_change", "updated_at"])
            Activity.objects.create(
                action="CHANGE_LINKED",
                description=f"Linked change {change.number}",
                user=request.user,
                problem=problem,
                change=change,
            )

        problem = (
            Problem.objects.filter(id=problem.id)
            .select_related(
                "assigned_to",
                "created_by",
                "assignment_group",
                "related_change",
                "organization",
            )
            .prefetch_related("linked_incidents__incident", "work_notes__author")
            .first()
        )
        return success(ProblemSerializer(problem).data, "change linked to problem")


class ProblemAiRcaView(OrgScopedMixin, APIView):
    """
    POST /problems/<uuid>/ai-rca/

    Delegates to ProblemService.run_ai_rca() which:
      1. Collects linked incident data + alert names
      2. Calls the configured AI backend (Ollama / stub)
      3. Persists result into problem.root_cause_analysis (JSONField)
      4. Returns the updated problem
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organization = self._organization()
        if organization is None:
            return failure("Organisation context required.", status_code=400)

        problem = Problem.objects.filter(id=pk, organization=organization).first()
        if not problem:
            return failure("Problem not found.", status_code=404)

        try:
            problem = ProblemService.run_ai_rca(problem)
            return success(
                ProblemSerializer(problem).data,
                "AI root-cause analysis complete.",
            )
        except Exception:
            logger.exception("AI RCA failed for problem %s", pk)
            return failure("AI analysis failed. Please try again.", status_code=500)


# ─── RCA Patch ────────────────────────────────────────────────────────────────

class ProblemRcaPatchView(OrgScopedMixin, APIView):
    """
    PATCH /problems/<uuid>/rca/

    Lightweight endpoint to apply root_cause + workaround from KB or AI
    without going through the full update serializer.
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        organization = self._organization()
        if organization is None:
            return failure("Organisation context required.", status_code=400)

        problem = Problem.objects.filter(id=pk, organization=organization).first()
        if not problem:
            return failure("Problem not found.", status_code=404)

        allowed_fields = {"root_cause", "workaround", "permanent_fix"}
        update_data = {
            k: v for k, v in request.data.items() if k in allowed_fields
        }
        if not update_data:
            return failure(
                f"Provide at least one of: {sorted(allowed_fields)}.",
                status_code=400,
            )

        for field, value in update_data.items():
            setattr(problem, field, value)
        problem.save(update_fields=list(update_data.keys()) + ["updated_at"])

        return success(ProblemSerializer(problem).data, "RCA fields updated.")
