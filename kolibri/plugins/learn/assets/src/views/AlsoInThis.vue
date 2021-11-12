<template>

  <div class="wrapper">
    <div class="top-bar">
      <h2>{{ title }}</h2>
    </div>

    <div
      v-if="contentNodes.length"
      class="content-list"
      :class="nextContent ? '' : 'no-bottom-link'"
    >
      <KRouterLink
        v-for="content in contentNodes"
        :key="content.id"
        :to="genContentLink(content.id, content.is_leaf, backRoute, context)"
        class="item"
        :class="windowIsSmall && 'small'"
        :style="linkStyles"
      >
        <LearningActivityIcon
          v-if="content.is_leaf"
          class="activity-icon"
          :kind="content.learning_activities"
        />
        <KIcon v-else class="topic-icon" icon="topic" />

        <div class="content-meta">
          <div class="text-and-time">
            <TextTruncator
              class="content-title"
              :text="content.title"
              :maxHeight="72"
            />
            <TimeDuration
              v-if="content.duration"
              class="time-duration"
              :style="{
                color: $themeTokens.annotation,
              }"
              :seconds="content.duration"
            />
          </div>
          <div class="progress">
            <KIcon
              v-if="content.progress === 1"
              icon="star"
              class="mastered-icon"
              :style="{ fill: $themeTokens.mastered }"
            />
            <ProgressBar v-else :contentNode="content" class="bar" />
          </div>
        </div>

      </KRouterLink>
    </div>

    <div v-else>
      {{ emptyMessage }}
    </div>

    <KRouterLink
      v-if="nextContent"
      :to="genContentLink(nextContent.id, nextContent.is_leaf, backRoute, context)"
      class="next-content-link"
      :style="{ borderTop: '1px solid ' + $themeTokens.fineLine, ...linkStyles }"
    >
      <KIcon class="folder-icon" icon="topic" />
      <div class="next-label">
        Next folder
      </div>
      <div class="next-title">
        {{ nextContent.title }}
      </div>
      <KIcon class="forward-icon" icon="forward" />
    </KRouterLink>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import SidePanelResourcesList from '../../../../../../kolibri/core/assets/src/views/FullScreenSidePanel/SidePanelResourcesList';
  import genContentLink from '../utils/genContentLink';
  import LearningActivityIcon from './LearningActivityIcon.vue';
  import ProgressBar from './ProgressBar';

  const sidePanelStrings = crossComponentTranslator(SidePanelResourcesList);

  export default {
    name: 'AlsoInThis',
    components: {
      LearningActivityIcon,
      ProgressBar,
      TextTruncator,
      TimeDuration,
    },
    mixins: [KResponsiveWindowMixin],
    props: {
      /**
       * contentNodes - The contentNode objects to be displayed. Each
       * contentNode must include the following keys id, title, duration, progress, is_leaf.
       */
      contentNodes: {
        type: Array,
        required: true,
        default: () => [],
      },
      /** Title text for the component. */
      title: {
        type: String,
        required: true,
      },
      /** Content node with the following properties: id, is_leaf, title */
      nextContent: {
        type: Object, // or falsy
        required: false,
        default: () => {},
        validator(node) {
          if (!node) {
            return true;
          } // falsy ok
          const { id, is_leaf, title } = node;
          return id && is_leaf && title;
        },
      },
      isLesson: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      ...mapState(['pageName']),
      ...mapState('lessonPlaylist', ['currentLesson']),
      /** Overrides some default styles in KRouterLink */
      linkStyles() {
        return {
          color: this.$themeTokens.text + '!important',
          fontSize: '14px',
        };
      },
      emptyMessage() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return this.isLesson
          ? sidePanelStrings.$tr('noOtherLessonResources')
          : sidePanelStrings.$tr('noOtherTopicResources');
        /* eslint-enable */
      },
      backRoute() {
        return this.pageName;
      },
      context() {
        let context = {
          id: this.$route.params.id,
        };
        if (this.currentLesson && this.currentLesson.classroom) {
          context['lessonId'] = this.currentLesson.id;
          context['classId'] = this.currentLesson.classroom.id;
        }
        return context;
      },
    },
    methods: { genContentLink },
  };

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  $parent-padding: 32px; // The SidePanel
  $icon-size: 32px;
  $progress-width: 48px;
  $top-bar-height: 40px;
  $next-content-link-height: 100px;

  .wrapper {
    position: relative;
    width: 100%;

    /* Avoids overflow issues, aligns bottom bit */
    height: calc(100% - 16px);
  }

  .top-bar {
    position: relative;
    top: 0;
    right: 0;
    left: 0;
    height: $top-bar-height;
    background-color: #ffffff;
  }

  .content-list {
    height: calc(100% - #{$top-bar-height} - #{$next-content-link-height});
    padding-right: 32px;

    /** margin <> padding offset keeps content aligned the same way
     *  whether the scrollbar is there or not and pushes the scrollbar
     *  agains the side of the screen, while being as tall as the scroll */
    margin-right: -32px;
    overflow-y: scroll;

    /* When there is nothing to link to in the next-content-link */
    &.no-bottom-link {
      height: calc(100% - #{$top-bar-height});
    }
  }

  .item {
    position: relative;
    display: block;
    width: 100%;
    min-height: 72px;
    margin-top: 24px;
  }

  .activity-icon,
  .next-label,
  .topic-icon {
    position: absolute;
    left: 0;
    display: inline-block;
    width: $icon-size;
    height: $icon-size;
  }

  .activity-icon,
  .topic-icon {
    top: 0;
  }

  .content-meta {
    position: relative;
    left: calc(#{$icon-size} + 16px);
    display: inline-block;
    width: calc(100% - #{$icon-size});
  }

  .text-and-time {
    display: inline-block;
    width: calc(100% - #{$icon-size} - #{$progress-width});
  }

  .progress {
    position: absolute;
    top: 0;
    right: 0;

    .bar {
      width: $progress-width;
      margin-right: 4px; // puts mastery star aligned center with bars
    }
  }
  .mastered-icon {
    top: 0;
    right: 16px;
    width: 24px;
    height: 24px;
  }

  /** Styles overriding the above when windowIsSmall **/
  .small {
    &.item {
      // Differentiate between items a bit better
      margin-bottom: 32px;
    }
    // Without the progress on the same line, don't incl it in calcs
    .content-meta {
      width: calc(100% - #{$icon-size});
    }
    .time-duration {
      display: block;
      width: 100%;
      margin-top: 8px;
    }
    .text-and-time {
      display: block;
      width: 100%;
    }
    // The progress section neds to become block & have some of its
    // spacing tweaked when it is on a small screen - under the text
    .progress {
      position: relative;
      display: block;
      width: 100%;
      margin-top: 8px;
    }
    .mastered-icon {
      right: auto;
      bottom: 0;
      left: 0;
    }
  }

  /** Most of the styles for the footer piece */
  .next-content-link {
    position: absolute;
    right: -32px;
    bottom: 0;
    left: -32px;
    height: $next-content-link-height;
    padding: 12px 32px 8px;
    background: white;

    .next-label {
      position: absolute;
      top: 30px;
      left: 80px;
      display: inline-block;
      min-width: 150px;
    }

    .next-title {
      position: absolute;
      left: 80px;
      font-weight: bold;
    }

    .folder-icon {
      top: 24px;
      left: 0;
      width: $icon-size;
      height: $icon-size;
    }
    .forward-icon {
      position: absolute;
      top: 34px;
      right: $parent-padding;
      width: $icon-size;
      height: $icon-size;
    }
  }

</style>
