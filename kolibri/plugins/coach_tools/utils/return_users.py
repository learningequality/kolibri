from kolibri.auth.constants import collection_kinds
from kolibri.auth.models import Collection, FacilityUser


def get_members_or_user(collection_kind, collection_id):
    if any(collection_kind in kind for kind in collection_kinds.choices):
        return Collection.objects.get(pk=collection_id).get_members()
    else:
        return FacilityUser.objects.filter(pk=collection_id)
