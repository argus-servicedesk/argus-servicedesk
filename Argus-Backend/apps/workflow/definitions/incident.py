TRANSITIONS = {
    ("NEW", "IN_PROGRESS"): {
        "required_fields": ["assigned_to"],
        "actions": ["start_sla_clock", "notify_assignee"],
    },
    ("NEW", "ON_HOLD"): {
        "actions": ["pause_sla_clock"],
    },
    ("NEW", "RESOLVED"): {
        "actions": ["stop_sla_clock", "notify_reporter", "log_transition"],
    },
    ("NEW", "CANCELLED"): {
        "actions": ["notify_reporter"],
    },
    ("IN_PROGRESS", "ON_HOLD"): {
        "actions": ["pause_sla_clock", "notify_reporter"],
    },
    ("IN_PROGRESS", "ESCALATED"): {
        "required_fields": ["escalation_reason"],
        "actions": ["notify_assignee"],
    },
    ("IN_PROGRESS", "RESOLVED"): {
        "required_fields": ["resolution_notes"],
        "actions": ["stop_sla_clock", "notify_reporter", "log_transition"],
    },
    ("ON_HOLD", "RESOLVED"): {
        "required_fields": ["resolution_notes"],
        "actions": ["stop_sla_clock", "notify_reporter", "log_transition"],
    },
    ("ON_HOLD", "IN_PROGRESS"): {
        "actions": ["resume_sla_clock", "notify_assignee"],
    },
    ("ESCALATED", "IN_PROGRESS"): {
        "actions": ["notify_assignee"],
    },
    ("ESCALATED", "RESOLVED"): {
        "required_fields": ["resolution_notes"],
        "actions": ["stop_sla_clock", "notify_reporter"],
    },
    ("RESOLVED", "CLOSED"): {
        "actions": ["log_transition"],
    },
    ("RESOLVED", "IN_PROGRESS"): {
        "required_fields": ["reopen_reason"],
        "actions": ["resume_sla_clock", "notify_assignee"],
    },
}
