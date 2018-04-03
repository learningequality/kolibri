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
      :link="lessonPlaylistLink(lesson.id)"
      :showContentIcon="false"
      :title="lesson.title"
      :kind="LESSON"
      :isMobile="isMobile"
      :progress="getLessonProgress(lesson)"
    />
  </div>

</template>


<script>

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import ContentCard from '../content-card';
  import { lessonPlaylistLink } from './classPageLinks';

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
      LESSON: () => ContentNodeKinds.LESSON,
    },
    methods: {
      getLessonProgress(lesson) {
        const { resources_completed, total_resources } = lesson.progress;
        if (total_resources === 0) return undefined;
        return resources_completed / total_resources;
      },
      lessonPlaylistLink,
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
