from django.db.models.signals import pre_delete
from django.dispatch import receiver

from .models import Membership


@receiver(pre_delete, sender=Membership)
def cascade_delete_membership(sender, instance=None, *args, **kwargs):
    """
    For a given membership instance and the collection associated with it,
    we delete all membership objects whose collection is a child of the instance's collection.
    """
    Membership.objects.filter(collection__parent_id=instance.collection_id).delete()
