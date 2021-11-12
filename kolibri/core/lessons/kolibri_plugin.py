from .single_user_assignment_utils import (
    update_assignments_from_individual_syncable_lessons,
)
from .single_user_assignment_utils import (
    update_individual_syncable_lessons_from_assignments,
)
from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.core.auth.sync_operations import KolibriSingleUserSyncOperation
from kolibri.plugins.hooks import register_hook


class SingleUserLessonSerializeOperation(KolibriSingleUserSyncOperation):
    def handle_remote_user(self, context, user_id):
        self._assert(context.is_producer)
        # if we're about to send data to a single-user device, prep the syncable lesson assignments
        update_individual_syncable_lessons_from_assignments(user_id)
        return False


class SingleUserLessonCleanupOperation(KolibriSingleUserSyncOperation):
    def handle_local_user(self, context, user_id):
        self._assert(context.is_receiver)
        # if we've just received data on a single-user device, update the lessons and assignments
        update_assignments_from_individual_syncable_lessons(user_id)
        return False


@register_hook
class LessonsSyncHook(FacilityDataSyncHook):
    serializing_operations = [SingleUserLessonSerializeOperation()]
    cleanup_operations = [SingleUserLessonCleanupOperation()]
