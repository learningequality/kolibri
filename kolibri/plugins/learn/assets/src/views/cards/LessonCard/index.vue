<template>

  <BaseCard
    v-if="lesson"
    v-bind="{ to, title, collectionTitle, completedLabel, inProgressLabel }"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import BaseCard from '../BaseCard';

  export default {
    name: 'LessonCard',
    components: {
      BaseCard,
    },
    mixins: [commonCoreStrings],
    props: {
      lesson: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       */
      to: {
        type: Object,
        required: true,
      },
      collectionTitle: {
        type: String,
        required: false,
        default: '',
      },
    },
    data() {
      return {
        progress: this.lesson ? this.lesson.progress : undefined,
        title: this.lesson ? this.lesson.title : '',
      };
    },
    computed: {
      lessonProgress() {
        if (!this.progress) {
          return NaN;
        }
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
    },
  };

</script>


<style lang="scss" scoped></style>
