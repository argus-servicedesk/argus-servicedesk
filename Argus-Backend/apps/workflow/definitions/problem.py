TRANSITIONS = {
    ("NEW", "INVESTIGATION"): {
        "actions": ["notify_assignee"]
    },
    ("INVESTIGATION", "RCA_IN_PROGRESS"): {
        "actions": ["notify_assignee"]
    },
    ("INVESTIGATION", "KNOWN_ERROR"): {
        "actions": ["notify_assignee"]
    },
    ("RCA_IN_PROGRESS", "KNOWN_ERROR"): {
        "actions": ["notify_assignee"]
    },
    ("RCA_IN_PROGRESS", "RESOLVED"): {
        "actions": ["notify_assignee", "log_transition"]
    },
    ("KNOWN_ERROR", "RESOLVED"): {
        "actions": ["notify_assignee", "log_transition"]
    },
    ("RESOLVED", "CLOSED"): {
        "actions": ["log_transition"]
    },
}