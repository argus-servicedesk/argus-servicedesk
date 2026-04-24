TRANSITIONS = {
    ("NEW", "INVESTIGATION"): {
        "required_fields": ["assigned_to"],
        "actions": ["notify_assignee"]
    },
    ("INVESTIGATION", "RCA_IN_PROGRESS"): {
        "required_fields": ["root_cause"],
        "actions": ["notify_assignee"]
    },
    ("RCA_IN_PROGRESS", "KNOWN_ERROR"): {
        "required_fields": ["workaround"],
        "actions": ["notify_assignee"]
    },
    ("KNOWN_ERROR", "RESOLVED"): {
        "required_fields": ["permanent_fix"],
        "actions": ["notify_assignee"]
    },
    ("RESOLVED", "CLOSED"): {
        "actions": ["log_transition"]
    },
}