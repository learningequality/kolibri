<template>

  <div class="wrapper">
    <div class="top-bar">
      <h2>{{ title }}</h2>
    </div>

    <div class="content-list">
      <KRouterLink
        v-for="content in contentNodes"
        :key="content.id"
        :to="genContentLink(content.id, content.is_leaf)"
        class="item"
        :style="linkStyles"
      >
        <LearningActivityIcon
          v-if="content.is_leaf"
          class="activity-icon"
          :kind="content.learning_activities"
        />
        <KIcon v-else class="topic-icon" icon="topic" />
        <div class="content-meta" :style="{ top: (content.duration ? '0px' : '8px') }">
          <TextTruncator
            :text="content.title"
            :maxHeight="24"
            :style="{ marginTop: (content.duration ? '8px' : '0px') }"
          />
          <TimeDuration
            v-if="content.duration"
            class="time-duration"
            :style="{ color: $themeTokens.annotation }"
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
          <ProgressBar v-else :progress="content.progress" class="bar" />
        </div>
      </KRouterLink>
    </div>

    <KRouterLink
      v-if="nextContent"
      :to="genContentLink(nextContent.id, nextContent.is_leaf)"
      class="next-content-link" 
      :style="{ backgroundColor: $themeTokens.fineLine }"
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

  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import genContentLink from '../utils/genContentLink';
  import LearningActivityIcon from './LearningActivityIcon.vue';
  import ProgressBar from './ProgressBar';

  export default {
    name: 'AlsoInThis',
    components: {
      LearningActivityIcon,
      ProgressBar,
      TextTruncator,
      TimeDuration,
    },
    props: {
      /**
       * contentNodes - The contentNode objects to be displayed. Each
       * contentNode must include the following keys id, title, duration, progress, is_leaf.
       */
      contentNodes: {
        type: Array,
        required: true,
      },
      /**
       * Title text for the component.
       */
      title: {
        type: String,
        required: true,
      },
      /** Content node with the following parameters: id, is_leaf, title */
      nextContent: {
        type: Object,
        required: false,
        default: () => {},
        validator(node) {
          const { id, is_leaf, title } = node;
          return id && is_leaf && title;
        },
      },
    },
    computed: {
      /** Overrides some styles in KRouterLink */
      linkStyles() {
        return {
          color: this.$themeTokens.text + '!important',
          fontSize: '14px',
        };
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
  $item-padding-x: 8px;

  .wrapper {
    position: relative;
    width: 100%;

    /* Avoids overflow issues, aligns bottom bit */
    height: calc(100% - 16px);
  }

  /** Most of the styles for the footer piece */
  .next-content-link {
    position: absolute;
    right: -32px;
    bottom: 0;
    left: -32px;
    height: 100px;
    padding: 12px 32px 8px;

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

  .item {
    position: relative;
    display: block;
    width: 100%;
    height: 56px;
    padding: 16px $item-padding-x;
    margin-top: 8px;
  }

  .activity-icon,
  .next-label,
  .topic-icon {
    position: absolute;
    left: $item-padding-x;
    display: inline-block;
    width: $icon-size;
    height: $icon-size;
  }

  .activity-icon,
  .topic-icon {
    top: 0;
  }

  .content-meta {
    position: absolute;
    left: calc(#{$icon-size} + #{$item-padding-x});
    display: inline-block;
    width: calc(100% - #{$icon-size} - #{$progress-width} - #{$item-padding-x * 2});
    height: 56px;
    padding: 0 16px;
  }

  .progress {
    position: absolute;
    top: 0;
    right: 0;

    .bar {
      width: $progress-width;
      margin-top: 16px;
    }
  }

  .mastered-icon {
    top: 0;
    right: 16px;
    width: 24px;
    height: 24px;
  }

  .top-bar {
    position: relative;
    top: 0;
    right: 0;
    left: 0;
    height: 40px;

    /* line-height: 40px; */
    background-color: #ffffff;
  }

  /** Just ensures a newline precedes this. So it is always
  positioned under the title at the start of the line */
  .time-duration::before {
    white-space: pre;
    content: '\a';
  }

</style>
