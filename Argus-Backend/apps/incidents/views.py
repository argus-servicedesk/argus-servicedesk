from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Count
from apps.common.mixins import OrgQuerysetMixin
from apps.common.responses import success, failure
from apps.changes.models import Change
from apps.problems.models import Problem
from .models import Incident, WorkNote, Activity, Attachment, IncidentProblem, IncidentChange
from .serializers import IncidentSerializer, IncidentCreateSerializer, IncidentUpdateSerializer, WorkNoteSerializer


class IncidentListCreateView(OrgQuerysetMixin, generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['state', 'priority', 'category', 'assigned_to']
    queryset = Incident.objects.all()
    
    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(number__icontains=search) | 
                Q(short_description__icontains=search) |
                Q(description__icontains=search)
            )
        return queryset.select_related('assigned_to', 'created_by', 'assignment_group').prefetch_related('work_notes', 'linked_problems__problem', 'linked_changes__change')
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return IncidentCreateSerializer
        return IncidentSerializer
    
    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        incident = serializer.save()
        return success(IncidentSerializer(incident).data, "incident created", 201)


class IncidentDetailView(OrgQuerysetMixin, generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    queryset = Incident.objects.all()

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return IncidentUpdateSerializer
        return IncidentSerializer

    def get_queryset(self):
        return super().get_queryset().select_related('assigned_to', 'created_by', 'assignment_group').prefetch_related('work_notes', 'activities', 'attachments', 'linked_problems__problem', 'linked_changes__change')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success(IncidentSerializer(instance).data)


class IncidentStatsView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        queryset = Incident.objects.filter(organization=request.organization)
        
        stats = {
            'total': queryset.count(),
            'open': queryset.filter(state__in=['NEW', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED']).count(),
            'p1': queryset.filter(priority='P1').count(),
            'p2': queryset.filter(priority='P2').count(),
            'p3': queryset.filter(priority='P3').count(),
            'p4': queryset.filter(priority='P4').count(),
            'resolved': queryset.filter(state='RESOLVED').count(),
            'closed': queryset.filter(state='CLOSED').count(),
            'sla_breached': queryset.filter(sla_breached=True).count(),
        }
        
        return success(stats)


class IncidentProblemLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organization = getattr(request, "organization", None)
        if organization is None:
            return failure("organization access denied", status_code=403)

        incident = Incident.objects.filter(organization=organization, pk=pk).first()
        if incident is None:
            return failure("incident not found", status_code=404)

        problem_id = request.data.get("problem_id") or request.data.get("problemId")
        if not problem_id:
            return failure("problem_id is required", status_code=400)

        problem = Problem.objects.filter(organization=organization, pk=problem_id).first()
        if problem is None:
            return failure("problem not found", status_code=404)

        link_type = request.data.get("link_type") or request.data.get("linkType") or IncidentProblem.LinkType.RELATED
        if link_type not in IncidentProblem.LinkType.values:
            return failure("invalid link type", status_code=400)

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
            action="PROBLEM_LINKED",
            description=f"Linked problem {problem.number}",
            user=request.user,
            incident=incident,
            problem=problem,
        )

        incident = (
            Incident.objects.filter(pk=incident.pk)
            .select_related('assigned_to', 'created_by', 'assignment_group')
            .prefetch_related('work_notes', 'activities', 'attachments', 'linked_problems__problem', 'linked_changes__change')
            .first()
        )
        return success(
            IncidentSerializer(incident).data,
            "problem linked to incident" if created else "incident problem link updated",
            201 if created else 200,
        )


class IncidentChangeLinkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        organization = getattr(request, "organization", None)
        if organization is None:
            return failure("organization access denied", status_code=403)

        incident = Incident.objects.filter(organization=organization, pk=pk).first()
        if incident is None:
            return failure("incident not found", status_code=404)

        change_id = request.data.get("change_id") or request.data.get("changeId")
        if not change_id:
            return failure("change_id is required", status_code=400)

        change = Change.objects.filter(organization=organization, pk=change_id).first()
        if change is None:
            return failure("change not found", status_code=404)

        notes = request.data.get("notes")
        link, created = IncidentChange.objects.get_or_create(
            incident=incident,
            change=change,
            defaults={"notes": notes},
        )
        if not created and notes is not None and link.notes != notes:
            link.notes = notes
            link.save(update_fields=["notes"])

        Activity.objects.create(
            action="CHANGE_LINKED",
            description=f"Linked change {change.number}",
            user=request.user,
            incident=incident,
            change=change,
        )

        incident = (
            Incident.objects.filter(pk=incident.pk)
            .select_related('assigned_to', 'created_by', 'assignment_group')
            .prefetch_related('work_notes', 'activities', 'attachments', 'linked_problems__problem', 'linked_changes__change')
            .first()
        )
        return success(
            IncidentSerializer(incident).data,
            "change linked to incident" if created else "incident change link updated",
            201 if created else 200,
        )


class WorkNoteCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = WorkNoteSerializer
    
    def perform_create(self, serializer):
        incident_id = self.kwargs.get('incident_id')
        serializer.save(author=self.request.user, incident_id=incident_id)


class IncidentTimelineView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        incident = (
            Incident.objects.filter(organization=request.organization, pk=pk)
            .select_related('assigned_to', 'created_by', 'assignment_group')
            .prefetch_related('activities__user', 'work_notes__author')
            .first()
        )
        if incident is None:
            return failure("incident not found", status_code=404)

        items = []

        for activity in incident.activities.all():
            items.append(
                {
                    "id": str(activity.id),
                    "type": "activity",
                    "action": activity.action,
                    "description": activity.description,
                    "oldValue": activity.old_value,
                    "newValue": activity.new_value,
                    "createdAt": activity.created_at.isoformat() if activity.created_at else None,
                    "user": (
                        {
                            "id": str(activity.user.id),
                            "firstName": activity.user.first_name,
                            "lastName": activity.user.last_name,
                            "email": activity.user.email,
                        }
                        if activity.user_id
                        else None
                    ),
                }
            )

        for note in incident.work_notes.all():
            items.append(
                {
                    "id": str(note.id),
                    "type": "work_note",
                    "action": "NOTE_ADDED",
                    "description": note.content,
                    "isInternal": note.is_internal,
                    "source": note.source,
                    "createdAt": note.created_at.isoformat() if note.created_at else None,
                    "user": (
                        {
                            "id": str(note.author.id),
                            "firstName": note.author.first_name,
                            "lastName": note.author.last_name,
                            "email": note.author.email,
                        }
                        if note.author_id
                        else None
                    ),
                }
            )

        items.sort(key=lambda item: item.get("createdAt") or "", reverse=True)
        return success(items)


class IncidentLiveContextView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        incident = (
            Incident.objects.filter(organization=request.organization, pk=pk)
            .select_related("config_item")
            .first()
        )
        if incident is None:
            return failure("incident not found", status_code=404)

        config_item = incident.config_item
        hostname = getattr(config_item, "hostname", None) or getattr(config_item, "name", None)
        ip_address = getattr(config_item, "ip_address", None)
        os_name = (getattr(config_item, "os", None) or "").strip()
        os_type = "windows" if "windows" in os_name.lower() else "linux" if os_name else None

        past_incidents = []
        if config_item is not None:
            related = (
                Incident.objects.filter(
                    organization=request.organization,
                    config_item=config_item,
                )
                .exclude(pk=incident.pk)
                .order_by("-created_at")[:5]
            )
            past_incidents = [
                {
                    "id": str(item.id),
                    "number": item.number,
                    "priority": item.priority,
                    "state": item.state,
                    "shortDescription": item.short_description,
                    "createdAt": item.created_at.isoformat() if item.created_at else None,
                }
                for item in related
            ]

        payload = {
            "alertContext": {
                "alertName": incident.source_alert_name or incident.short_description,
                "instance": hostname or ip_address,
                "hostname": hostname,
                "ip": ip_address,
                "source": incident.source,
            },
            "metrics": {
                "available": False,
                "error": None,
                "osType": os_type,
                "cpu": {"usagePct": 0, "cores": None},
                "memory": {"usedPct": 0, "totalBytes": None},
                "load": {"m1": 0, "m5": 0, "cores": 1},
                "filesystems": [],
                "interfaces": [],
                "sysInfo": {
                    "hostname": hostname,
                    "os": os_name or None,
                    "kernel": None,
                    "arch": None,
                    "uptimeSeconds": None,
                },
            },
            "firingAlerts": [],
            "pastIncidents": past_incidents,
        }
        return success(payload)

