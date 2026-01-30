<template>

  <KModal
    :title="deleteCourseTitle$()"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <span class="fix-message-line-height">
      {{ deleteCourseConfirmation$({ title: courseTitle }) }}
    </span>
  </KModal>

</template>


<script>

  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import { coreString } from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'DeleteCourseConfirmationModal',
    setup() {
      const { deleteCourseConfirmation$, deleteCourseTitle$ } = coursesStrings;
      return {
        deleteCourseConfirmation$,
        deleteCourseTitle$,
        coreString,
      };
    },
    props: {
      courseTitle: {
        type: String,
        required: true,
      },
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
