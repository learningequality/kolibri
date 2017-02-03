import logging

from django.contrib.auth.signals import user_logged_in
from django.dispatch import receiver

from .models import UserSessionLog

logger = logging.getLogger(__name__)

@receiver(user_logged_in)
def create_user_session(sender, **kwargs):
    user = kwargs["user"]
    logger.info("User Session for {user} Created!".format(user=user))
    UserSessionLog.update_log(user)
