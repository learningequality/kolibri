import logging

from kolibri.core.content.permissions import CanManageContent
from kolibri.core.tasks.decorators import register_task

logger = logging.getLogger(__name__)


@register_task(permission_classes=[CanManageContent])
def add(x, y):
    raise Exception


@register_task(permission_classes=[CanManageContent])
def subtract(x, y):
    logger.info("Subtraction of x & y will be {result}".format(result=x - y))
