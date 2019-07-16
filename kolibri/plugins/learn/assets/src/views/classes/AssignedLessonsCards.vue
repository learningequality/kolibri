<template>

  <div>
    <div class="header">
      <h2>
        {{ coreString('lessonsLabel') }}
      </h2>
      <p v-if="lessons.length===0">
        {{ $tr('noLessonsMessage') }}
      </p>
    </div>
    <ContentCard
      v-for="lesson in lessons"
      :key="lesson.id"
      class="content-card"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import ContentCard from '../ContentCard';
  import { lessonPlaylistLink } from './classPageLinks';

  export default {
    name: 'AssignedLessonsCards',
    components: {
      ContentCard,
    },
    mixins: [commonCoreStrings],
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
        const { resource_progress, total_resources } = lesson.progress;
        if (total_resources === 0) return undefined;
        return resource_progress / total_resources;
      },
      lessonPlaylistLink,
    },
    $trs: {
      noLessonsMessage: 'You have no lessons assigned',
    },
  };

</script>


<style lang="scss" scoped>

  .content-card {
    margin-right: 16px;
    margin-bottom: 16px;
  }

</style>
