<template>

  <div>
    <ContentPage
      @updateProgress="updateProgress"
    >
      <div slot="below_content" class="below-content-area">
        <template v-if="nextLessonResource">
          <h1>{{ $tr('nextInLesson') }}</h1>
          <ContentCard
            :isMobile="true"
            :kind="nextLessonResource.kind"
            :link="nextResourceLink"
            :progress="nextLessonResource.progress_fraction"
            :thumbnail="getContentNodeThumbnail(nextLessonResource)"
            :numCoachContents="nextLessonResource.coach_content ? 1 : 0"
            :title="nextLessonResource.title"
          />
        </template>
      </div>
    </ContentPage>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import ContentCard from '../ContentCard';
  import ContentPage from '../ContentPage';
  import { LearnerClassroomResource } from '../../apiResources';
  import { lessonResourceViewerLink } from './classPageLinks';

  // HACK replace computed properties since they use different module in Lessons
  const LessonContentPage = {
    extends: ContentPage,
    computed: {
      content() {
        return this.$store.state.lessonPlaylist.resource.content;
      },
      contentId() {
        return this.content.content_id;
      },
      contentNodeId() {
        return this.content.id;
      },
      parentTopic() {
        return null;
      },
      channelId() {
        return this.content.channel_id;
      },
      // Not used in this context
      recommended: () => [],
      channel: () => ({}),
    },
  };

  export default {
    name: 'LessonResourceViewer',
    metaInfo() {
      return {
        title: this.currentLessonResource.title,
      };
    },
    components: {
      ContentCard,
      ContentPage: LessonContentPage,
    },
    computed: {
      ...mapState('lessonPlaylist/resource', {
        currentLessonResource: state => state.content,
        nextLessonResource: state => state.content.next_content,
      }),
      nextResourceLink() {
        return lessonResourceViewerLink(Number(this.$route.params.resourceNumber) + 1);
      },
    },
    methods: {
      getContentNodeThumbnail,
      updateProgress() {
        // Clear the learner classroom cache here as its progress data is now
        // stale
        LearnerClassroomResource.clearCache();
      },
    },
    $trs: {
      nextInLesson: 'Next in lesson',
    },
  };

</script>


<style lang="scss" scoped>

  .below-content-area {
    max-width: 800px;
  }

</style>
