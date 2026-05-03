from apps.integrations.tasks import notify_integrations_task
from .tasks import send_email_task

def broadcast_notification(organization, message, resource_type=None, resource_id=None, email_recipients=None, email_subject=None, email_template=None, email_context=None):
    """
    Orchestrates notifications across multiple channels.
    """
    # 1. Notify external integrations (Slack, Teams, etc.)
    notify_integrations_task.delay(
        organization_id=str(organization.id),
        message=message,
        resource_type=resource_type,
        resource_id=resource_id
    )
    
    # 2. Send emails if requested
    if email_recipients and email_template:
        for email in email_recipients:
            send_email_task.delay(
                recipient_email=email,
                subject=email_subject or "Argus Notification",
                template_name=email_template,
                context=email_context or {}
            )
