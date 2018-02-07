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
  import EditLessonDetailsModal from './EditLessonDetailsModal';
  import { LessonActions } from '../../../lessonsConstants';

  const actionToModalMap = {
    [LessonActions.CHANGE_STATUS]: ChangeLessonStatusModal,
    [LessonActions.COPY]: CopyLessonModal,
    [LessonActions.DELETE]: DeleteLessonModal,
    [LessonActions.EDIT_DETAILS]: EditLessonDetailsModal,
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
