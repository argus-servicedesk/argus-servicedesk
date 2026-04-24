TRANSITIONS = {
    ("NEW", "ASSESSMENT"): {
        "required_fields": ["justification", "risk_level"],
        "actions": ["notify_assignee"]
    },
    ("ASSESSMENT", "APPROVAL"): {
        "required_fields": ["implementation_plan", "rollback_plan", "test_plan"],
        "actions": ["create_approval_records", "notify_assignee"]
    },
    ("APPROVAL", "SCHEDULED"): {
        "system_only": True,
        "actions": ["notify_assignee"]
    },
    ("SCHEDULED", "IMPLEMENTING"): {
        "actions": ["notify_assignee"]
    },
    ("IMPLEMENTING", "REVIEW"): {
        "required_fields": ["review_notes"],
        "actions": ["notify_assignee"]
    },
    ("REVIEW", "CLOSED"): {
        "required_fields": ["closure_code"],
        "actions": ["log_transition"]
    },
    ("IMPLEMENTING", "CANCELLED"): {
        "required_fields": ["cancellation_reason"],
        "min_role": "MANAGER",
        "actions": ["notify_assignee"]
    },
}