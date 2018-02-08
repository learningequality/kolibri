<template>

  <component
    :is="currentModal"
    @cancel="$emit('cancel')"
  />

</template>


<script>

  import ChangeLessonStatusModal from './ChangeLessonStatusModal';
  import CopyLessonModal from './CopyLessonModal';
  import DeleteLessonModal from './DeleteLessonModal';
  import LessonDetailsModal from './LessonDetailsModal';
  import { LessonActions } from '../../../lessonsConstants';

  const actionToModalMap = {
    [LessonActions.CHANGE_STATUS]: ChangeLessonStatusModal,
    [LessonActions.COPY]: CopyLessonModal,
    [LessonActions.DELETE]: DeleteLessonModal,
    [LessonActions.EDIT_DETAILS]: LessonDetailsModal,
  };

  export default {
    name: 'manageLessonModels',
    props: {
      currentAction: {
        type: String,
      },
    },
    computed: {
      currentModal() {
        return actionToModalMap[this.currentAction] || null;
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
