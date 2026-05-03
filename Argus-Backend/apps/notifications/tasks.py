from celery import shared_task
from .email_utils import send_notification_email
import logging

logger = logging.getLogger(__name__)

@shared_task(name="notifications.send_email_task")
def send_email_task(recipient_email, subject, template_name, context):
    """
    Asynchronous task to send an email.
    """
    logger.info(f"Starting async email task for {recipient_email}")
    success = send_notification_email(recipient_email, subject, template_name, context)
    return success
