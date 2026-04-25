from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.incidents.models import Incident, Activity
from apps.organizations.models import Organization


class Command(BaseCommand):
    help = 'Escalate overdue incidents by setting sla_breached=True and creating activity records'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be escalated without making changes',
        )
        parser.add_argument(
            '--org',
            type=str,
            help='Only process incidents for a specific organization (by name)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        org_name = options.get('org')
        
        now = timezone.now()
        
        # Build queryset for overdue incidents
        queryset = Incident.objects.filter(
            sla_due_at__lt=now,
            sla_breached=False,
        ).exclude(
            state__in=['RESOLVED', 'CLOSED', 'CANCELLED']
        )
        
        # Filter by organization if specified
        if org_name:
            try:
                org = Organization.objects.get(name=org_name)
                queryset = queryset.filter(organization=org)
                self.stdout.write(f"Processing incidents for organization: {org_name}")
            except Organization.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Organization '{org_name}' not found")
                )
                return
        
        overdue_incidents = queryset.select_related('organization')
        count = overdue_incidents.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS("No overdue incidents found")
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"DRY RUN: Would escalate {count} incidents:")
            )
            for incident in overdue_incidents:
                overdue_minutes = int((now - incident.sla_due_at).total_seconds() / 60)
                self.stdout.write(
                    f"  - {incident.number}: {incident.short_description} "
                    f"(overdue by {overdue_minutes} minutes)"
                )
            return
        
        # Process each overdue incident
        escalated_count = 0
        for incident in overdue_incidents:
            try:
                # Set sla_breached = True with idempotent conditional update
                updated = Incident.objects.filter(id=incident.id, sla_breached=False).update(sla_breached=True)
                if updated == 0:
                    # Already processed by another worker/run
                    continue
                
                # Create activity record
                Activity.objects.create(
                    incident=incident,
                    action='SLA_BREACHED',
                    description='SLA breached automatically',
                    user=None,  # System action
                )
                
                escalated_count += 1
                
                overdue_minutes = int((now - incident.sla_due_at).total_seconds() / 60)
                self.stdout.write(
                    f"Escalated {incident.number}: {incident.short_description} "
                    f"(overdue by {overdue_minutes} minutes)"
                )
                
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f"Failed to escalate {incident.number}: {str(e)}"
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully escalated {escalated_count} out of {count} incidents"
            )
        )