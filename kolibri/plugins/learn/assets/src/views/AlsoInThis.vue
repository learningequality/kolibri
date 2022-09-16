<template>

  <div class="wrapper">
    <div
      v-if="contentNodes.length"
      class="content-list"
      :class="nextContent ? 'bottom-link' : ''"
    >
      <KRouterLink
        v-for="content in contentNodes"
        :key="content.id"
        :to="genContentLink(content.id, null, content.is_leaf, null, context)"
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
              v-if="progressFor(content) === 1"
              icon="star"
              class="mastered-icon"
              :style="{ fill: $themeTokens.mastered }"
            />
            <ProgressBar v-else :contentNode="content" class="bar" />
          </div>
        </div>

      </KRouterLink>
    </div>

    <KCircularLoader v-else-if="loading" />

    <div v-else>
      {{ emptyMessage }}
    </div>

    <KRouterLink
      v-if="nextContent"
      :to="genContentLink(nextContent.id, null, nextContent.is_leaf, null, context)"
      class="next-content-link"
      :style="{
        borderTop: '1px solid ' + $themeTokens.fineLine,
        background: $themeTokens.surface,
        ...linkStyles
      }"
    >
      <KIcon class="folder-icon" icon="topic" />
      <div class="next-label">
        {{ nextFolderMessage }}
      </div>
      <div class="next-title">
        {{ nextContent.title }}
      </div>
      <KIcon class="forward-icon" icon="forward" />
    </KRouterLink>
  </div>

</template>


<script>

  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import KResponsiveWindowMixin from 'kolibri-design-system/lib/KResponsiveWindowMixin';
  import SidePanelResourcesList from '../../../../../../kolibri/core/assets/src/views/SidePanelModal/SidePanelResourcesList';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
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
    setup() {
      const { contentNodeProgressMap } = useContentNodeProgress();
      return { contentNodeProgressMap };
    },
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
      loading: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
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
      context() {
        return this.$route.query;
      },
      nextFolderMessage() {
        /* eslint-disable kolibri/vue-no-undefined-string-uses */
        return sidePanelStrings.$tr('nextFolder');
        /* eslint-enable */
      },
    },
    methods: {
      genContentLink,
      progressFor(node) {
        return this.contentNodeProgressMap[node.content_id] || 0;
      },
    },
  };

</script>


<style scoped lang="scss">

  @import '~kolibri-design-system/lib/styles/definitions';

  $parent-padding: 32px; // The SidePanel
  $icon-size: 32px;
  $progress-width: 48px;
  $next-content-link-height: 100px;

  .content-list.bottom-link {
    // Ensure all items are visible when bottom link visible
    padding-bottom: $next-content-link-height;
  }

  .wrapper {
    position: relative;
    width: 100%;

    /* Avoids overflow issues, aligns bottom bit */
    height: calc(100% - 16px);
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
    position: fixed;
    bottom: 0;
    width: 436px;
    height: $next-content-link-height;
    padding: 12px 32px 8px;
    margin-right: -32px;
    margin-left: -32px;

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
      top: 15px;
      right: $parent-padding;
      width: $icon-size;
      height: $icon-size;
    }
  }

</style>
