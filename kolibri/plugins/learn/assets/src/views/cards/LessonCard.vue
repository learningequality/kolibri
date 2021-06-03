<template>

  <AssignmentCard
    v-bind="{ classroomName, assignmentName, completedLabel, inProgressLabel, to: lessonLink }"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ClassesPageNames } from '../../constants';
  import AssignmentCard from './AssignmentCard.vue';

  export default {
    name: 'LessonCard',
    components: {
      AssignmentCard,
    },
    mixins: [commonCoreStrings],
    props: {
      classroom: {
        type: Object,
        required: true,
      },
      lesson: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        progress: this.lesson.progress || {},
        classroomName: this.classroom.name || '',
        assignmentName: this.lesson.title || '',
      };
    },
    computed: {
      lessonProgress() {
        const { resource_progress, total_resources } = this.progress;
        if (resource_progress * total_resources === 0) {
          return NaN;
        } else {
          return resource_progress - total_resources;
        }
      },
      inProgressLabel() {
        return this.lessonProgress < 0 ? this.coreString('inProgressLabel') : '';
      },
      completedLabel() {
        return this.lessonProgress >= 0 ? this.coreString('completedLabel') : '';
      },
      lessonLink() {
        return {
          name: ClassesPageNames.LESSON_PLAYLIST,
          params: {
            lessonId: this.lesson.id,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped></style>
