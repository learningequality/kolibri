<template>

  <span :class="['resource-label', condensed ? 'resource-label-condensed' : {}]">
    <template v-if="!hideIcon">
      <LearningActivityIcon
        v-if="contentNode.is_leaf"
        class="icon"
        :kind="contentNode.learning_activities"
      />
      <KIcon
        v-else
        class="icon"
        icon="topic"
        :color="$themePalette.grey.v_700"
      />
    </template>

    <span class="text-wrapper">
      <component
        :is="contentNodeRoute ? 'KRouterLink' : 'span'"
        :to="contentNodeRoute"
        :tabindex="disableLinkFocus ? -1 : 0"
        class="title"
      >
        {{ contentNode.title }}
      </component>
      <TimeDuration
        v-if="contentNode.duration"
        class="duration"
        :seconds="contentNode.duration"
        :style="{ color: $themePalette.grey.v_800 }"
      />
    </span>
  </span>

</template>


<script>

  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';

  /**
   * Renders learning activity/topic icon, title,
   * and (when available) learning activity duration
   * of a resource.
   */
  export default {
    name: 'ResourceLabel',
    components: {
      LearningActivityIcon,
      TimeDuration,
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      /**
       * vue-router link object
       * If provided, a resource title will be rendered
       * as a link targeting this route.
       */
      contentNodeRoute: {
        type: Object,
        required: false,
        default: null,
      },
      /**
       * Sets `tabindex` of a link to -1.
       * Useful when a parent element behaves like
       * a link itself and we only want to display
       * focus ring for that element.
       */
      disableLinkFocus: {
        type: Boolean,
        required: false,
        default: false,
      },
      hideIcon: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * The icon renders smaller and is moved
       * next to the title in `condensed` mode.
       */
      condensed: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .resource-label {
    display: flex;
    align-items: center;

    .icon {
      // override KIcon's relative positioning
      // to allow more precise vertical centering
      position: static;
      flex-shrink: 0;
      margin-right: 16px;
      font-size: 32px;
    }

    .duration {
      display: block;
      margin-top: 6px;
    }
  }

  .resource-label-condensed {
    // Since duration is absolutely positioned in condensed mode,
    // make sure that it stays in the area of the component
    // by means of adding extra padding.
    // Otherwise the component could behave unexpectedly in places
    // where it's used (e.g. focus ring overlapping text).
    padding-bottom: 26px;

    .icon {
      margin-right: 8px;
      font-size: 24px;
    }

    .text-wrapper {
      position: relative;
    }

    .duration {
      position: absolute;
    }
  }

  .text-wrapper {
    flex-grow: 1;
  }

  .title {
    display: block;
  }

</style>
