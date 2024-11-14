<template>

  <div class="wrapper">
    <MissingResourceAlert v-if="missingLessonResources" />
    <div
      v-if="contentNodes.length"
      class="content-list"
      :class="nextFolder ? 'bottom-link' : ''"
    >
      <KRouterLink
        v-for="content in contentNodes"
        :key="content.id"
        :to="
          content.is_leaf
            ? genContentLinkKeepCurrentBackLink(content.id, content.is_leaf)
            : genContentLinkKeepPreviousBackLink(content.id)
        "
        class="item"
        :class="[
          windowIsSmall && 'small',
          content.id === currentResourceId && $computedClass(currentlyViewedItemStyle),
        ]"
        :style="linkStyles"
      >
        <p
          v-if="content.id === currentResourceId"
          :style="currentlyViewingTextStyle"
        >
          {{ $tr('currentlyViewing') }}
        </p>
        <LearningActivityIcon
          v-if="content.is_leaf"
          class="activity-icon"
          :kind="content.learning_activities"
        />
        <KIcon
          v-else
          class="topic-icon"
          icon="topic"
        />

        <div class="content-meta">
          <div class="text-and-time">
            <KTextTruncator
              class="content-title"
              :text="content.title"
              :maxLines="2"
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
            <ProgressBar
              v-else
              :contentNode="content"
              class="bar"
            />
          </div>
        </div>
      </KRouterLink>
    </div>

    <KCircularLoader v-else-if="loading" />

    <div v-else>
      {{ emptyMessage }}
    </div>

    <KRouterLink
      v-if="nextFolder"
      :to="genContentLinkKeepPreviousBackLink(nextFolder.id)"
      class="next-content-link"
      :style="{
        borderTop: '1px solid ' + $themeTokens.fineLine,
        background: $themeTokens.surface,
        ...linkStyles,
      }"
    >
      <KIcon
        class="folder-icon"
        icon="topic"
      />
      <div class="next-label">
        {{ nextFolderMessage }}
      </div>
      <div class="next-title">
        {{ nextFolder.title }}
      </div>
      <KIcon
        class="forward-icon"
        icon="forward"
      />
    </KRouterLink>
  </div>

</template>


<script>

  import isBoolean from 'lodash/isBoolean';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import useContentNodeProgress from '../composables/useContentNodeProgress';
  import useContentLink from '../composables/useContentLink';
  import ProgressBar from './ProgressBar';

  export default {
    name: 'AlsoInThis',
    components: {
      LearningActivityIcon,
      ProgressBar,
      TimeDuration,
      MissingResourceAlert,
    },
    setup() {
      const { contentNodeProgressMap } = useContentNodeProgress();
      const { genContentLinkKeepCurrentBackLink, genContentLinkKeepPreviousBackLink } =
        useContentLink();
      const { windowIsSmall } = useKResponsiveWindow();
      return {
        contentNodeProgressMap,
        genContentLinkKeepCurrentBackLink,
        genContentLinkKeepPreviousBackLink,
        windowIsSmall,
      };
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
      nextFolder: {
        type: Object, // or falsy
        required: false,
        default: () => {},
        validator(node) {
          if (!node) {
            return true;
          } // falsy ok
          const { id, is_leaf, title } = node;
          return id && isBoolean(is_leaf) && title;
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
      currentResourceId: {
        type: String,
        required: true,
      },
      missingLessonResources: {
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
      currentlyViewingTextStyle() {
        return {
          color: this.$themePalette.grey.v_800,
          fontSize: '12px',
          margin: 'auto',
        };
      },
      currentlyViewedItemStyle() {
        return {
          padding: '15px 0',
          ':before': {
            content: "''",
            backgroundColor: this.$themePalette.grey.v_200,
            position: 'absolute',
            top: '0',
            bottom: '0',
            width: '200vw',
            transform: 'translateX(-50%)',
            zIndex: '-1',
          },
        };
      },
      emptyMessage() {
        return this.isLesson
          ? this.$tr('noOtherLessonResources')
          : this.$tr('noOtherTopicResources');
      },
      nextFolderMessage() {
        return this.$tr('nextFolder');
      },
    },
    methods: {
      progressFor(node) {
        return this.contentNodeProgressMap[node.content_id] || 0;
      },
    },
    $trs: {
      currentlyViewing: {
        message: 'Currently viewing',
        context: 'Indicator of resource that is currently being viewed.',
      },
      noOtherLessonResources: {
        message: 'No other resources in this lesson',
        context:
          'Message indicating that no resources remain in the lesson they are engaging with.',
      },
      noOtherTopicResources: {
        message: 'No other resources in this folder',
        context: 'Message indicating that no resources remain in the topic they are browsing.',
      },
      nextFolder: {
        message: 'Next folder',
        context: 'Indicates navigation to the next folder and its contents.',
      },
    },
  };

</script>


<style lang="scss" scoped>

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
    top: -30px;
    width: 100%;

    /* Avoids overflow issues, aligns bottom bit */
    height: calc(100% - 16px);
  }

  .item {
    position: relative;
    display: block;
    width: 100%;
    min-height: 72px;
    padding: 20px 0;
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
    top: auto;
  }

  .content-meta {
    position: relative;
    left: calc(#{$icon-size} + 16px);
    display: inline-block;
    width: calc(100% - #{$icon-size});
    margin-top: 5px;
  }

  .text-and-time {
    display: inline-block;
    display: flex;
    flex-direction: column;
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

  /deep/ .link {
    text-decoration: none;
  }

  /** Styles overriding the above when windowIsSmall **/
  .small {
    &.item {
      // Differentiate between items a bit better
      margin-bottom: 32px;
    }
    // Without the progress on the same line, don't incl it in calcs
    .content-meta {
      display: flex;
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
