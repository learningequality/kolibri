from kolibri.core.auth.models import Collection
from kolibri.core.auth.models import FacilityUser


def get_members_or_user(collection_kind, collection_id):
    if "user" == collection_kind:
        return FacilityUser.objects.filter(pk=collection_id)
    return (
        Collection.objects.filter(kind=collection_kind)
        .get(pk=collection_id)
        .get_members()
    )
