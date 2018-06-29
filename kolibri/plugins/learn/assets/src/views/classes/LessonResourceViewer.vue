<template>

  <div>
    <content-page>
      <div slot="below_content" class="below-content-area">
        <template v-if="nextLessonResource">
          <h1>{{ $tr('nextInLesson') }}</h1>
          <content-card
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
    </content-page>
  </div>

</template>


<script>

  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import ContentCard from '../content-card';
  import ContentPage from '../content-page';
  import { lessonResourceViewerLink } from './classPageLinks';

  export default {
    name: 'lessonResourceViewer',
    components: {
      ContentCard,
      ContentPage,
    },
    computed: {
      nextResourceLink() {
        return lessonResourceViewerLink(Number(this.$route.params.resourceNumber) + 1);
      },
    },
    methods: {
      getContentNodeThumbnail,
    },
    vuex: {
      getters: {
        currentLesson: state => state.pageState.currentLesson,
        currentLessonResource: state => state.pageState.content,
        nextLessonResource: state => state.pageState.content.next_content,
      },
    },
    $trs: {
      nextInLesson: 'Next in lesson',
    },
  };

</script>


<style lang="stylus" scoped>

  .below-content-area
    max-width: 800px

</style>
