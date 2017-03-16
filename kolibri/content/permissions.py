from django.db.models.query import F
from kolibri.auth.filters import HierarchyRelationsFilter
from kolibri.auth.permissions.general import DenyAll
from kolibri.logger.models import ExamLog


class UserCanReadExamAssignmentData(DenyAll):

    def user_can_read_object(self, user, obj):
        # If they are not a member of the assignment's collection, don't bother with any other checks
        return user.is_member_of(obj.collection) and (
            obj.exam.active or ExamLog.objects.filter(exam=obj.exam, user=user).exists())

    def readable_by_user_filter(self, user, queryset):
        return HierarchyRelationsFilter(queryset).filter_by_hierarchy(
            source_user=user,
            ancestor_collection=F("collection"),
        )
