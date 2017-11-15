from django.db.models import Q
from django.db.models.query import F
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.models import AnonymousUser
from kolibri.auth.permissions.general import DenyAll


class UserCanReadExamAssignmentData(DenyAll):

    def user_can_read_object(self, user, obj):
        if isinstance(user, AnonymousUser):
            return False
        # Import here to avoid circular import.
        from kolibri.logger.models import ExamLog
        # If they are not a member of the assignment's collection, don't bother with any other checks
        return user.is_member_of(obj.collection) and (
            obj.exam.active or ExamLog.objects.filter(exam=obj.exam, user=user).exists())

    def readable_by_user_filter(self, user, queryset):
        if isinstance(user, AnonymousUser):
            return queryset.none()
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            target_user=user,
            ancestor_collection=F("collection"),
        ).filter(Q(exam__active=True) | Q(exam__examlogs__user=user))
