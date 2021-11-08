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
       * @param {Array<object>} contentNodes - The contentNode objects to be displayed. Each
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

  $icon-size: 32px;
  $progress-width: 48px;
  $item-padding-x: 8px;

  .wrapper {
    position: relative;
    width: 100%;
    height: 100%;
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
  .topic-icon {
    position: absolute;
    top: 0;
    left: $item-padding-x;
    display: inline-block;
    width: $icon-size;
    height: $icon-size;
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
    right: 0;
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
