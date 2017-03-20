import logging

from django.contrib.auth.signals import user_logged_in
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import ContentSessionLog, UserSessionLog

logger = logging.getLogger(__name__)

@receiver(user_logged_in)
def login_session_receiver(sender, **kwargs):
    user = kwargs["user"]
    UserSessionLog.update_log(user)

@receiver(post_save, sender=ContentSessionLog)
def content_session_receiver(sender, **kwargs):
    user = kwargs["instance"].user
    UserSessionLog.update_log(user)
