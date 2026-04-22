from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q, Avg
from apps.common.responses import success
from apps.incidents.models import Incident
from apps.changes.models import Change
from apps.problems.models import Problem
from apps.alerts.models import Alert
from apps.assets.models import ConfigurationItem


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        org_id = request.organization_id
        
        # Incident stats
        incidents = Incident.objects.filter(organization_id=org_id)
        incident_stats = {
            'total': incidents.count(),
            'open': incidents.filter(state__in=['NEW', 'IN_PROGRESS', 'ON_HOLD', 'ESCALATED']).count(),
            'p1_count': incidents.filter(priority='P1').count(),
            'p2_count': incidents.filter(priority='P2').count(),
            'p3_count': incidents.filter(priority='P3').count(),
            'p4_count': incidents.filter(priority='P4').count(),
            'sla_breached': incidents.filter(sla_breached=True).count(),
            'resolved': incidents.filter(state='RESOLVED').count(),
            'closed': incidents.filter(state='CLOSED').count(),
            'by_state': dict(incidents.values_list('state').annotate(count=Count('id'))),
            'by_priority': dict(incidents.values_list('priority').annotate(count=Count('id'))),
        }
        
        # Change stats
        changes = Change.objects.filter(organization_id=org_id)
        change_stats = {
            'total': changes.count(),
            'pending': changes.filter(state__in=['NEW', 'ASSESSMENT', 'APPROVAL']).count(),
            'implementing': changes.filter(state='IMPLEMENTING').count(),
            'success_rate': 0,  # Would need to calculate from closed changes
        }
        
        # Problem stats
        problems = Problem.objects.filter(organization_id=org_id)
        problem_stats = {
            'total': problems.count(),
            'open': problems.filter(state__in=['NEW', 'INVESTIGATION', 'RCA_IN_PROGRESS']).count(),
            'known_errors': problems.filter(state='KNOWN_ERROR').count(),
        }
        
        # Alert stats
        alerts = Alert.objects.filter(organization_id=org_id)
        alert_stats = {
            'firing': alerts.filter(status='FIRING').count(),
            'resolved_24h': alerts.filter(status='RESOLVED', resolved_at__gte=timezone.now() - timedelta(hours=24)).count(),
            'critical': alerts.filter(severity='CRITICAL').count(),
            'warning': alerts.filter(severity='WARNING').count(),
        }
        
        # Asset stats
        assets = ConfigurationItem.objects.filter(organization_id=org_id)
        asset_stats = {
            'total': assets.count(),
            'live': assets.filter(status='LIVE').count(),
            'maintenance': assets.filter(status='MAINTENANCE').count(),
            'monitoring_enabled': assets.filter(monitoring_enabled=True).count(),
        }
        
        # Recent items
        recent_incidents = Incident.objects.filter(organization_id=org_id).order_by('-created_at')[:5]
        recent_changes = Change.objects.filter(organization_id=org_id).order_by('-created_at')[:5]
        active_alerts = Alert.objects.filter(organization_id=org_id, status='FIRING').order_by('-fired_at')[:10]
        
        data = {
            'incidents': incident_stats,
            'changes': change_stats,
            'problems': problem_stats,
            'alerts': alert_stats,
            'assets': asset_stats,
            'recent_incidents': [{'id': str(i.id), 'number': i.number, 'short_description': i.short_description, 'state': i.state, 'priority': i.priority, 'created_at': i.created_at.isoformat()} for i in recent_incidents],
            'recent_changes': [{'id': str(c.id), 'number': c.number, 'short_description': c.short_description, 'state': c.state, 'type': c.type, 'created_at': c.created_at.isoformat()} for c in recent_changes],
            'active_alerts': [{'id': str(a.id), 'alert_id': a.alert_id, 'name': a.name, 'severity': a.severity, 'fired_at': a.fired_at.isoformat()} for a in active_alerts],
        }
        
        return success(data)


from django.utils import timezone
