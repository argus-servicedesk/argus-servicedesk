TRANSITIONS = {
    ("NEW", "ASSESSMENT"): {
        "actions": ["notify_assignee"]
    },
    ("NEW", "APPROVAL"): {
        "actions": ["notify_assignee"]
    },
    ("NEW", "CANCELLED"): {
        "actions": ["notify_assignee"]
    },
    ("ASSESSMENT", "APPROVAL"): {
        "actions": ["notify_assignee"]
    },
    ("ASSESSMENT", "CANCELLED"): {
        "actions": ["notify_assignee"]
    },
    ("APPROVAL", "SCHEDULED"): {
        "actions": ["notify_assignee"]
    },
    ("APPROVAL", "CANCELLED"): {
        "actions": ["notify_assignee"]
    },
    ("SCHEDULED", "IMPLEMENTING"): {
        "actions": ["notify_assignee"]
    },
    ("SCHEDULED", "CANCELLED"): {
        "actions": ["notify_assignee"]
    },
    ("IMPLEMENTING", "REVIEW"): {
        "actions": ["notify_assignee"]
    },
    ("IMPLEMENTING", "CANCELLED"): {
        "actions": ["notify_assignee"]
    },
    ("REVIEW", "CLOSED"): {
        "actions": ["log_transition"]
    },
    ("REVIEW", "CANCELLED"): {
        "actions": ["notify_assignee"]
    },
}
