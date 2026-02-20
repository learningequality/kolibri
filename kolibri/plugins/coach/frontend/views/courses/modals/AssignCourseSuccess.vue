<template>

  <KModal
    :title="courseIsAssignedTitle$()"
    :submitText="closeAction$()"
    @submit="$emit('close')"
  >
    <span class="fix-message-line-height">
      {{ courseIsAssignedMessage$() }}
    </span>
  </KModal>

</template>


<script>

  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'AssignCourseSuccessModal',
    setup() {
      const { closeAction$ } = coreStrings;
      const { courseIsAssignedTitle$, courseIsAssignedMessage$ } = coursesStrings;
      return {
        closeAction$,
        courseIsAssignedTitle$,
        courseIsAssignedMessage$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .fix-message-line-height {
    // Override default global line-height of 1.15 which is not enough
    // space for kmodal and makes scrollbar appear in their parent containers.
    line-height: 1.5;
  }

</style>
