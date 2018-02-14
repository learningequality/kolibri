<template>

  <div>
    <div class="header">
      <h2>
        {{ $tr('lessonsHeader') }}
      </h2>
      <p v-if="lessons.length===0">
        {{ $tr('noLessonsMessage') }}
      </p>
    </div>
    <content-card
      class="content-card"
      v-for="lesson in lessons"
      :key="lesson.id"
      :link="{}"
      :showContentIcon="false"
      :title="lesson.name"
      :kind="lessonIsCompleted(lesson) ? COMPLETED_LESSON : LESSON"
      :isMobile="isMobile"
      :progress="getLessonProgress(lesson)"
    />
  </div>

</template>


<script>

  import ContentCard from '../content-card';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'assignedLessonsCards',
    components: {
      ContentCard,
    },
    props: {
      lessons: {
        type: Array,
        required: true,
      },
      isMobile: {
        type: Boolean,
        required: true,
      },
    },
    computed: {
      COMPLETED_LESSON: () => ContentNodeKinds.COMPLETED_LESSON,
      LESSON: () => ContentNodeKinds.LESSON,
    },
    methods: {
      lessonIsCompleted(lesson) {
        return false;
      },
      getLessonProgress(lesson) {
        return 1.0;
      },
    },
    $trs: {
      lessonsHeader: 'Lessons',
      noLessonsMessage: 'You have no lessons assigned',
    },
  };

</script>


<style lang="stylus" scoped>

  .content-card
    margin-right: 16px
    margin-bottom: 16px

</style>
