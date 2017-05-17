import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ContentSessionLog, UserSessionLog

logger = logging.getLogger(__name__)

@receiver(post_save, sender=ContentSessionLog)
def content_session_receiver(sender, **kwargs):
    user = kwargs["instance"].user
    UserSessionLog.update_log(user)
