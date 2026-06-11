from django.db.models.signals import post_save
from django.db.models.signals import pre_delete
from django.dispatch import receiver

from kolibri.core.notifications.models import LearnerProgressNotification

from .models import FacilityUser
from .models import Membership
from .models import Role
from .utils.picture_passwords import get_learner_count


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


@receiver([post_save, pre_delete], sender=FacilityUser)
def facility_user_clear_learner_count(sender, instance=None, *args, **kwargs):
    get_learner_count.clear(instance.dataset_id)


@receiver([post_save, pre_delete], sender=Role)
def role_clear_learner_count(sender, instance=None, *args, **kwargs):
    get_learner_count.clear(instance.dataset_id)
