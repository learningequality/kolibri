<template>

  <div>
    <section class="lesson-details">
      <div>
        <content-icon
          kind="lesson"
          class="lesson-icon"
        />
        <h1 class="title">
          {{ currentLesson.title }}
          <progress-icon v-if="lessonHasResources" :progress="lessonProgress" />
        </h1>
      </div>
      <div v-if="currentLesson.description!==''">
        <h3>{{ $tr('teacherNote') }}</h3>
        <p> {{ currentLesson.description }}</p>
      </div>
    </section>

    <section class="content-cards">
      <content-card
        v-for="(c, idx) in contentNodes"
        :key="c.pk"
        class="content-card"
        :isMobile="true"
        :kind="c.kind"
        :link="lessonResourceViewerLink(idx)"
        :progress="c.progress_fraction"
        :numCoachContents="c.coach_content ? 1 : 0"
        :thumbnail="getContentNodeThumbnail(c)"
        :title="c.title"
      />

      <p v-if="!lessonHasResources" class="no-resources-message">
        {{ $tr('noResourcesInLesson') }}
      </p>
    </section>
  </div>

</template>


<script>

  import sumBy from 'lodash/sumBy';
  import ProgressIcon from 'kolibri.coreVue.components.progressIcon';
  import ContentIcon from 'kolibri.coreVue.components.contentIcon';
  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import ContentCard from '../content-card';
  import { lessonResourceViewerLink } from './classPageLinks';

  export default {
    name: 'lessonPlaylistPage',
    components: {
      ContentCard,
      ContentIcon,
      ProgressIcon,
    },
    computed: {
      lessonHasResources() {
        return this.contentNodes.length > 0;
      },
      lessonProgress() {
        if (this.lessonHasResources) {
          // HACK: Infer the Learner's progress by summing the progress_fractions
          // on all the ContentNodes
          const total = sumBy(this.contentNodes, cn => cn.progress_fraction || 0);
          if (total === 0) {
            return null;
          }
          return total / this.contentNodes.length;
        }
      },
    },
    methods: {
      getContentNodeThumbnail,
      lessonResourceViewerLink,
    },
    vuex: {
      getters: {
        contentNodes: state => state.pageState.contentNodes,
        currentLesson: state => state.pageState.currentLesson,
      },
    },
    $trs: {
      noResourcesInLesson: 'There are no resources in this lesson',
      teacherNote: 'Coach note',
    },
  };

</script>


<style lang="stylus" scoped>

  .lesson-details
    margin-bottom: 32px

  .title
    display: inline-block

  .content-cards
    max-width: 800px

  .content-card
    margin-bottom: 16px

  .no-resources-message
    text-align: center
    font-weight: bold
    padding: 48px 0

  // Copied from LessonSummaryPage
  .lesson-icon
    display: inline-block
    font-size: 1.8em
    margin-right: 0.5em
    >>>.ui-icon
      vertical-align: bottom

</style>
