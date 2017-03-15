from kolibri.auth.models import Collection, FacilityUser


def get_members_or_user(collection_kind, collection_id):
    if 'user' == collection_kind:
        return FacilityUser.objects.filter(pk=collection_id)
    else:  # if not user, then it must be a collection
        return Collection.objects.filter(kind=collection_kind).get(pk=collection_id).get_members()
