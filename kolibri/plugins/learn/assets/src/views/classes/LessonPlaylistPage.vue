<template>

  <div>
    <section class="lesson-details">
      <div>
        <ContentIcon
          kind="lesson"
          class="lesson-icon"
        />
        <h1 dir="auto" class="title">
          {{ currentLesson.title }}
          <ProgressIcon
            v-if="lessonHasResources"
            class="progress-icon"
            :progress="lessonProgress"
          />
        </h1>
      </div>
      <div v-if="currentLesson.description !== ''">
        <h3>{{ $tr('teacherNote') }}</h3>
        <p dir="auto">
          {{ currentLesson.description }}
        </p>
      </div>
    </section>

    <section class="content-cards">
      <HybridLearningCardGrid
        v-if="contentNodes.length"
        currentPage="lessonPage"
        cardViewStyle="list"
        :numCols="null"
        :getContentNodeThumbnail="getContentNodeThumbnail"
        :genContentLink="genContentLink"
        :contents="contentNodes"
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
  import genContentLink from '../../utils/genContentLink';
  import HybridLearningCardGrid from './../HybridLearningCardGrid';

  export default {
    name: 'LessonPlaylistPage',
    metaInfo() {
      return {
        title: this.currentLesson.title,
      };
    },
    components: {
      HybridLearningCardGrid,
      ContentIcon,
      ProgressIcon,
    },
    computed: {
      ...mapState('lessonPlaylist', ['contentNodes', 'currentLesson']),
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

        return undefined;
      },
    },
    methods: {
      getContentNodeThumbnail,
      genContentLink,
    },
    $trs: {
      noResourcesInLesson: {
        message: 'There are no resources in this lesson',
        context:
          "This text displays in the learner's 'Lessons' section if the coach has not added any resources to the lesson.",
      },
      teacherNote: 'Coach note',
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
    max-width: 100%;
  }

  .content-card {
    margin-bottom: 16px;
  }

  .no-resources-message {
    padding: 48px 0;
    font-weight: bold;
    text-align: center;
  }

  .lesson-icon {
    display: inline-block;
    margin-right: 0.5em;
    font-size: 1.8em;
    /deep/ .ui-icon {
      margin-bottom: 12px;
      vertical-align: middle;
    }
  }

  .progress-icon {
    display: inline-block;
    margin-right: 0.5em;
    font-size: 1.8em;
    /deep/ .ui-icon {
      margin-top: 4px;
      vertical-align: middle;
    }
  }

</style>
