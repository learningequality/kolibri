from django.db.models import Q

from kolibri.core.auth.models import AnonymousUser
from kolibri.core.auth.permissions.base import q_none
from kolibri.core.auth.permissions.general import DenyAll


class UserCanReadExamAssignmentData(DenyAll):
    def user_can_read_object(self, user, obj):
        if isinstance(user, AnonymousUser):
            return False
        # Import here to avoid circular import.
        from kolibri.core.logger.models import ExamLog

        # If they are not a member of the assignment's collection, don't bother with any other checks
        return user.is_member_of(obj.collection) and (
            obj.exam.active or ExamLog.objects.filter(exam=obj.exam, user=user).exists()
        )

    def readable_by_user_filter(self, user):
        if isinstance(user, AnonymousUser):
            return q_none
        return Q(collection_id__in=user.memberships.all().values("collection_id")) & Q(
            Q(exam__active=True) | Q(exam__examlogs__user=user)
        )


class UserCanReadExamData(DenyAll):
    def user_can_read_object(self, user, obj):
        if isinstance(user, AnonymousUser):
            return False
        # Import here to avoid circular import.
        from kolibri.core.logger.models import ExamLog

        # If they are not a member of the assignment's collection, don't bother with any other checks
        return obj.assignments.objects.filter(
            collection_id__in=user.memberships.all().values("collection_id")
        ).exists() and (
            obj.active or ExamLog.objects.filter(exam=obj, user=user).exists()
        )

    def readable_by_user_filter(self, user):
        if isinstance(user, AnonymousUser):
            return q_none
        from kolibri.core.exams.models import ExamAssignment

        assignments = ExamAssignment.objects.filter(
            collection_id__in=user.memberships.all().values("collection_id")
        )
        return Q(assignments__in=assignments) & Q(
            Q(active=True) | Q(examlogs__user=user)
        )
