<template>

  <LearnAppBarPage :appBarTitle="learnString('learnLabel')">
    <div
      v-if="!$store.state.core.loading"
      role="main"
    >
      <KBreadcrumbs
        :items="breadcrumbs"
        :ariaLabel="learnString('classesAndAssignmentsLabel')"
      />
      <section class="lesson-details">
        <div>
          <ContentIcon
            kind="lesson"
            class="lesson-icon"
          />
          <h1
            dir="auto"
            class="title"
          >
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
        <ResourceSyncingUiAlert v-if="lessonResources.length > contentNodes.length" />
      </section>

      <section
        v-if="lessonHasResources"
        class="content-cards"
      >
        <HybridLearningLessonCard
          v-for="content in contentNodes"
          :key="content.id"
          :content="content"
          class="content-card"
          :isMobile="windowIsSmall"
          :link="genContentLinkBackLinkCurrentPage(content.id, true)"
        />
      </section>
      <p
        v-else
        class="no-resources-message"
      >
        {{ $tr('noResourcesInLesson') }}
      </p>
    </div>
    <KCircularLoader v-else />
  </LearnAppBarPage>

</template>


<script>

  import { mapMutations, mapState } from 'vuex';
  import KBreadcrumbs from 'kolibri-design-system/lib/KBreadcrumbs';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import ProgressIcon from 'kolibri-common/components/labels/ProgressIcon';
  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import ResourceSyncingUiAlert from '../ResourceSyncingUiAlert';
  import useContentLink from '../../composables/useContentLink';
  import useContentNodeProgress from '../../composables/useContentNodeProgress';
  import { PageNames, ClassesPageNames } from '../../constants';
  import commonLearnStrings from './../commonLearnStrings';
  import LearnAppBarPage from './../LearnAppBarPage';
  import HybridLearningLessonCard from './../HybridLearningLessonCard';

  export default {
    name: 'LessonPlaylistPage',
    metaInfo() {
      return {
        title: this.currentLesson.title,
      };
    },
    components: {
      KBreadcrumbs,
      HybridLearningLessonCard,
      ContentIcon,
      ProgressIcon,
      LearnAppBarPage,
      ResourceSyncingUiAlert,
    },
    mixins: [commonCoreStrings, commonLearnStrings],
    setup() {
      const { genContentLinkBackLinkCurrentPage } = useContentLink();
      const { contentNodeProgressMap } = useContentNodeProgress();
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        contentNodeProgressMap,
        genContentLinkBackLinkCurrentPage,
        windowIsSmall,
      };
    },
    computed: {
      ...mapState('lessonPlaylist', ['contentNodesMap', 'currentLesson']),
      contentNodes() {
        return this.lessonResources
          .map(r => {
            return this.contentNodesMap[r.contentnode_id] || null;
          })
          .filter(Boolean);
      },
      lessonResources() {
        return (this.currentLesson && this.currentLesson.resources) || [];
      },
      lessonHasResources() {
        return this.lessonResources.length > 0;
      },
      lessonHasResourcesAvailable() {
        return this.contentNodes.length > 0;
      },
      lessonProgress() {
        if (this.lessonHasResourcesAvailable) {
          // HACK: Infer the Learner's progress by summing the progress_fractions
          // on all the ContentNodes
          const total = Object.values(this.contentNodesMap).reduce(
            (tot, node) => tot + (this.contentNodeProgressMap[node.content_id] || 0),
            0,
          );
          if (total === 0) {
            return null;
          }
          return total / this.contentNodes.length;
        }

        return undefined;
      },
      breadcrumbs() {
        return this.currentLesson && this.currentLesson.classroom
          ? [
            {
              text: this.coreString('homeLabel'),
              link: { name: PageNames.HOME },
            },
            {
              text: this.coreString('classesLabel'),
              link: { name: ClassesPageNames.ALL_CLASSES },
            },
            {
              text: this.currentLesson.classroom.name,
              link: {
                name: ClassesPageNames.CLASS_ASSIGNMENTS,
                params: { classId: this.currentLesson.classroom.id },
              },
            },
            {
              text: this.currentLesson.title,
            },
          ]
          : [];
      },
    },
    beforeDestroy() {
      /* If we are going anywhere except for content we unset the lesson */

      if (this.$route.name !== PageNames.TOPICS_CONTENT) {
        this.SET_CURRENT_LESSON({});
      }
    },
    methods: {
      ...mapMutations('lessonPlaylist', ['SET_CURRENT_LESSON']),
    },
    $trs: {
      noResourcesInLesson: {
        message: 'There are no resources in this lesson',
        context:
          "This text displays in the learner's 'Lessons' section if the coach has not added any resources to the lesson.",
      },
      teacherNote: {
        message: 'Coach note',
        context:
          'Label for the field where the coach can add notes for their learners regarding the resource.',
      },
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
