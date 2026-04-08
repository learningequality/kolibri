from django.db.models.signals import post_save
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import FacilityUser
from .models import Membership
from .utils.picture_passwords import get_learner_count
from kolibri.core.notifications.models import LearnerProgressNotification


@receiver(pre_delete, sender=Membership)
def cascade_delete_membership(sender, instance=None, *args, **kwargs):
    """
    For a given membership instance and the collection associated with it,
    we delete all membership objects whose collection is a child of the instance's collection.
    """
    Membership.objects.filter(
        collection__parent_id=instance.collection_id, user=instance.user
    ).delete()


@receiver(pre_delete, sender=FacilityUser)
def cascade_delete_user(sender, instance=None, *args, **kwargs):
    """
    For a given user,  we delete all notifications
    objects whose user is the instance's user.
    """
    LearnerProgressNotification.objects.filter(user_id=instance.id).delete()


@receiver(post_save, sender=FacilityUser)
def post_save_clear_learner_count(sender, instance=None, *args, **kwargs):
    get_learner_count.clear(instance.dataset_id)


@receiver(pre_delete, sender=FacilityUser)
def pre_delete_clear_learner_count(sender, instance=None, *args, **kwargs):
    get_learner_count.clear(instance.dataset_id)
