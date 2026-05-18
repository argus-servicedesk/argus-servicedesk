from apps.integrations.tasks import notify_integrations_task
from .models import Notification
from .tasks import send_email_task

def broadcast_notification(
    organization,
    message,
    resource_type=None,
    resource_id=None,
    email_recipients=None,
    email_subject=None,
    email_template=None,
    email_context=None,
    user=None,
    users=None,
):
    """
    Orchestrates notifications across multiple channels.
    """
    recipients = []
    if user is not None:
        recipients.append(user)
    if users:
        recipients.extend(users)

    notification_type = resource_type if resource_type in Notification.Type.values else Notification.Type.SYSTEM
    title = message.split(":", 1)[0][:255]
    link = f"/{str(resource_type or '').lower()}s/{resource_id}" if resource_type and resource_id else None

    for recipient in recipients:
        Notification.objects.create(
            user=recipient,
            organization=organization,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            channel=Notification.Channel.WEB,
        )

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
