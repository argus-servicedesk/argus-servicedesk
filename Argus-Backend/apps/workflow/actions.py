from django.utils import timezone
from datetime import timedelta


def start_sla_clock(record, user, org, context):
    """Set sla_due_at on the incident based on priority"""
    if not hasattr(record, 'priority'):
        return
    if hasattr(record, 'sla_due_at') and record.sla_due_at and not getattr(record, 'sla_resolved_at', None):
        # SLA clock already running; keep existing due time.
        return
    
    # Priority to hours mapping
    priority_hours = {
        'P1': 1,   # 1 hour
        'P2': 4,   # 4 hours
        'P3': 8,   # 8 hours
        'P4': 24,  # 24 hours
    }
    
    hours = priority_hours.get(record.priority, 8)  # Default to 8 hours
    due_time = timezone.now() + timedelta(hours=hours)
    
    if hasattr(record, 'sla_due_at'):
        record.sla_due_at = due_time
        record.save(update_fields=['sla_due_at'])


def stop_sla_clock(record, user, org, context):
    """Set sla_resolved_at and check if breached"""
    now = timezone.now()
    
    if hasattr(record, 'sla_resolved_at'):
        record.sla_resolved_at = now
    
    # Check if SLA was breached
    if hasattr(record, 'sla_due_at') and hasattr(record, 'sla_breached') and record.sla_due_at:
        if now > record.sla_due_at:
            record.sla_breached = True
    
    fields_to_update = []
    if hasattr(record, 'sla_resolved_at'):
        fields_to_update.append('sla_resolved_at')
    if hasattr(record, 'sla_breached'):
        fields_to_update.append('sla_breached')
    if fields_to_update:
        record.save(update_fields=fields_to_update)


def pause_sla_clock(record, user, org, context):
    """Set sla_paused_at to now"""
    if hasattr(record, 'sla_paused_at') and not record.sla_paused_at:
        record.sla_paused_at = timezone.now()
        record.save(update_fields=['sla_paused_at'])


def resume_sla_clock(record, user, org, context):
    """Resume SLA clock by adjusting sla_due_at for paused duration"""
    if not hasattr(record, 'sla_paused_at') or not record.sla_paused_at:
        return
    
    now = timezone.now()
    paused_duration = now - record.sla_paused_at
    
    fields_to_update = []
    # Add the paused duration to sla_due_at to compensate
    if hasattr(record, 'sla_due_at') and record.sla_due_at:
        record.sla_due_at += paused_duration
        fields_to_update.append('sla_due_at')
    
    # Clear sla_paused_at
    record.sla_paused_at = None
    fields_to_update.append('sla_paused_at')
    
    record.save(update_fields=fields_to_update)


def notify_assignee(record, user, org, context):
    """Stub - log only for now"""
    pass


def notify_reporter(record, user, org, context):
    """Stub"""
    pass


def create_approval_records(record, user, org, context):
    """Stub"""
    pass


def log_transition(record, user, org, context):
    """Always runs"""
    pass


ACTION_MAP = {
    "start_sla_clock": start_sla_clock,
    "stop_sla_clock": stop_sla_clock,
    "pause_sla_clock": pause_sla_clock,
    "resume_sla_clock": resume_sla_clock,
    "notify_assignee": notify_assignee,
    "notify_reporter": notify_reporter,
    "create_approval_records": create_approval_records,
    "log_transition": log_transition,
}