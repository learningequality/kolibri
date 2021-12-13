<template>

  <div v-if="contentNode" :class="[ condensed ? 'condensed' : '']">
    <div class="learning-activity">
      <span
        v-if="!labelAfter"
        class="label-before"
        data-test="label"
      >
        {{ label }}
      </span>
      <template v-if="contentNode.learning_activities">
        <LearningActivityIcon
          v-for="(learningActivity, idx) in contentNode.learning_activities"
          :key="idx"
          class="icon"
          :kind="learningActivity"
          :style="{ fontSize: '18px' }"
        />
      </template>
      <span
        v-if="labelAfter"
        class="label-after"
        data-test="label"
      >
        {{ label }}
      </span>
    </div>

    <span v-if="displaySeparator" class="separator">|</span>

    <LearningActivityDuration
      v-if="!hideDuration"
      :contentNode="contentNode"
      class="duration"
    />
  </div>

</template>


<script>

  import { computed } from 'kolibri.lib.vueCompositionApi';
  import { get } from '@vueuse/core';
  import useLearningActivities from '../../../composables/useLearningActivities';
  import LearningActivityIcon from '../../LearningActivityIcon';
  import LearningActivityDuration from './LearningActivityDuration';

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
      const {
        hasSingleActivity,
        firstActivity,
        isReference,
        hasDuration,
        getLearningActivityLabel,
      } = useLearningActivities(props.contentNode);

      const label = computed(() => {
        return get(hasSingleActivity) ? getLearningActivityLabel(get(firstActivity)) : '';
      });

      const displaySeparator = computed(() => {
        return props.condensed && !props.hideDuration && (get(isReference) || get(hasDuration));
      });

      return {
        label,
        displaySeparator,
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
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .label-before {
    padding-right: 4px;
  }

  .label-after {
    padding-left: 4px;
  }

  .icon {
    // override KIcon's `position: relative` to allow
    // for precise vertical centering of label and icon
    position: static;
  }

  .duration {
    margin-top: 8px;
    text-align: right;
  }

  .condensed {
    display: flex;
    align-items: center;

    .duration {
      margin-top: 0;
      text-align: left;
    }

    .separator {
      padding-right: 4px;
      padding-left: 4px;
    }
  }

</style>
