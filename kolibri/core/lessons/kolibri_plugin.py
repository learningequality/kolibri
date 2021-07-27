from .single_user_assignment_utils import (
    update_assignments_from_individual_syncable_lessons,
)
from .single_user_assignment_utils import (
    update_individual_syncable_lessons_from_assignments,
)
from kolibri.core.auth.hooks import FacilityDataSyncHook
from kolibri.plugins.hooks import register_hook


@register_hook
class SingleUserLessonSyncHook(FacilityDataSyncHook):
    def pre_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        # if we're about to send data to a single-user device, prep the syncable lesson assignments
        if context.is_producer and remote_is_single_user:
            update_individual_syncable_lessons_from_assignments(single_user_id)

    def post_transfer(
        self,
        dataset_id,
        local_is_single_user,
        remote_is_single_user,
        single_user_id,
        context,
    ):
        # if we've just received data on a single-user device, update the lessons and assignments
        if context.is_receiver and local_is_single_user:
            update_assignments_from_individual_syncable_lessons(single_user_id)
