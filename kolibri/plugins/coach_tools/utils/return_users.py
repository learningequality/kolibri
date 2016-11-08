from kolibri.auth.constants import collection_kinds
from kolibri.auth.models import Collection, FacilityUser


def get_collection_or_user(kwargs):
    collection_kind = kwargs.get('collection_kind', None)
    collection_id = kwargs.get('collection_id', None)
    user_pk = kwargs.get('pk', None)
    if any(collection_kind in kind for kind in collection_kinds.choices):
        return Collection.objects.get(pk=collection_id).get_members()
    elif collection_id:
        return FacilityUser.objects.filter(pk=collection_id)
    else:
        return FacilityUser.objects.filter(pk=user_pk)
