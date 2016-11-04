from kolibri.auth.constants import collection_kinds
from kolibri.auth.models import Collection, FacilityUser


def get_collection_or_user(kwargs):
    collection_kind = kwargs.get('collection_kind', None)
    collection_pk = kwargs.get('collection_pk', None)
    user_pk = kwargs.get('pk', None)
    if any(collection_kind in kind for kind in collection_kinds.choices):
        return Collection.objects.get(pk=collection_pk).get_members()
    elif collection_pk:
        return FacilityUser.objects.get(pk=collection_pk)
    else:
        return FacilityUser.objects.get(pk=user_pk)
