def start_sla_clock(record, user, org, context):
    """Stub - set sla_started_at"""
    pass


def stop_sla_clock(record, user, org, context):
    """Stub - set resolved_at"""
    pass


def pause_sla_clock(record, user, org, context):
    """Stub"""
    pass


def resume_sla_clock(record, user, org, context):
    """Stub"""
    pass


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