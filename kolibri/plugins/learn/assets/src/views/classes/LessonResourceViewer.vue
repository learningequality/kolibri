<template>

  <div>
    <ContentPage>
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
  import { lessonResourceViewerLink } from './classPageLinks';

  export default {
    name: 'LessonResourceViewer',
    metaInfo() {
      return {
        title: this.currentLessonResource.title,
      };
    },
    components: {
      ContentCard,
      ContentPage,
    },
    computed: {
      ...mapState({
        currentLesson: state => state.pageState.currentLesson,
        currentLessonResource: state => state.pageState.content,
        nextLessonResource: state => state.pageState.content.next_content,
      }),
      nextResourceLink() {
        return lessonResourceViewerLink(Number(this.$route.params.resourceNumber) + 1);
      },
    },
    methods: {
      getContentNodeThumbnail,
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
