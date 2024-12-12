<template>

  <div v-if="contentNode">
    <span
      class="learning-activity"
      :class="[condensed || labelAfter ? 'reversed' : '']"
    >
      <span
        class="label"
        data-test="label"
      >
        {{ label }}
      </span>
      <span v-if="contentNode.learning_activities">
        <LearningActivityIcon
          v-for="(learningActivity, idx) in contentNode.learning_activities"
          :key="idx"
          class="icon"
          :kind="learningActivity"
        />
      </span>
    </span>

    <LearningActivityDuration
      v-if="!hideDuration"
      :contentNode="contentNode"
      class="duration"
      :class="[condensed ? 'condensed' : '']"
    />
  </div>

</template>


<script>

  import { computed } from 'vue';
  import { get } from '@vueuse/core';
  import LearningActivityIcon from 'kolibri-common/components/ResourceDisplayAndSearch/LearningActivityIcon.vue';
  import useLearningActivities from '../../composables/useLearningActivities';
  import LearningActivityDuration from '../LearningActivityDuration';

  /**
   * Shows icon, label, and duration of a learning activity.
   * Multiple icons and no label are displayed for multiple learning activities.
   */
  export default {
    name: 'LearningActivityLabel',
    components: {
      LearningActivityIcon,
      LearningActivityDuration,
    },
    setup(props) {
      const { hasSingleActivity, firstActivity, getLearningActivityLabel } = useLearningActivities(
        props.contentNode,
      );

      const label = computed(() => {
        return get(hasSingleActivity) ? getLearningActivityLabel(get(firstActivity)) : '';
      });

      return {
        label,
      };
    },
    props: {
      contentNode: {
        type: Object,
        required: true,
      },
      hideDuration: {
        type: Boolean,
        required: false,
        default: false,
      },
      // allows for switching the order of the label and the icon
      labelAfter: {
        type: Boolean,
        required: false,
        default: false,
      },
      // show the label and duration on one row separated by a vertical line
      condensed: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .learning-activity {
    display: inline-flex;
    align-items: center;

    &.reversed {
      flex-direction: row-reverse;
    }
  }

  .label {
    padding-right: 4px;
    padding-left: 4px;
  }

  .icon {
    font-size: 18px;

    &:not(:first-child) {
      margin-left: 2px;
    }
  }

  .duration {
    display: block;
    margin-top: 4px;

    &.condensed {
      display: inline-block;
      margin-top: 0;

      &::before {
        content: '|';
      }
    }
  }

</style>
