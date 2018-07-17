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

  import { mapState } from 'vuex';
  import sumBy from 'lodash/sumBy';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';
  import ContentIcon from 'kolibri.coreVue.components.ContentIcon';
  import { getContentNodeThumbnail } from 'kolibri.utils.contentNode';
  import ContentCard from '../ContentCard';
  import { lessonResourceViewerLink } from './classPageLinks';

  export default {
    name: 'LessonPlaylistPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ContentCard,
      ContentIcon,
      ProgressIcon,
    },
    computed: {
      ...mapState({
        contentNodes: state => state.pageState.contentNodes,
        currentLesson: state => state.pageState.currentLesson,
      }),
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
    $trs: {
      noResourcesInLesson: 'There are no resources in this lesson',
      teacherNote: 'Coach note',
      documentTitle: 'Lesson contents',
    },
  };

</script>


<style lang="scss" scoped>

  .lesson-details {
    margin-bottom: 32px;
  }

  .title {
    display: inline-block;
  }

  .content-cards {
    max-width: 800px;
  }

  .content-card {
    margin-bottom: 16px;
  }

  .no-resources-message {
    padding: 48px 0;
    font-weight: bold;
    text-align: center;
  }

  // Copied from LessonSummaryPage
  .lesson-icon {
    display: inline-block;
    margin-right: 0.5em;
    font-size: 1.8em;
    /deep/ .ui-icon {
      vertical-align: bottom;
    }
  }

</style>
