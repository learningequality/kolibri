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

    <span v-if="condensed" class="separator">|</span>

    <div
      v-if="!hideDuration"
      class="duration"
      data-test="duration"
    >
      <TimeDuration
        v-if="displayMinutes"
        :style="{ display: 'block' }"
        :seconds="contentNode.duration"
      />
      <span v-else>
        {{ durationEstimation }}
      </span>
    </div>
  </div>

</template>


<script>

  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import TimeDuration from 'kolibri.coreVue.components.TimeDuration';
  import LearningActivityIcon from '../../LearningActivityIcon';

  /**
   * Shows an icon and a label for a learning activity.
   * Multiple icons and no label are displayed for multiple learning activities.
   *
   * Also shows time duration or textual representation of duration (which
   * of these is displayed depends on a learning activity type and its length).
   * For read activity, 'Reference' is displayed instead of time.
   */
  export default {
    name: 'LearningActivityLabel',
    components: {
      LearningActivityIcon,
      TimeDuration,
    },
    mixins: [commonCoreStrings],
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
    computed: {
      LearningActivityToLabelMap() {
        return {
          [LearningActivities.CREATE]: this.coreString('create'),
          [LearningActivities.LISTEN]: this.coreString('listen'),
          [LearningActivities.REFLECT]: this.coreString('reflect'),
          [LearningActivities.PRACTICE]: this.coreString('practice'),
          [LearningActivities.READ]: this.coreString('read'),
          [LearningActivities.WATCH]: this.coreString('watch'),
          [LearningActivities.EXPLORE]: this.coreString('explore'),
        };
      },
      hasSomeActivities() {
        return (
          this.contentNode.learning_activities && this.contentNode.learning_activities.length > 0
        );
      },
      hasMultipleActivities() {
        return this.hasSomeActivities && this.contentNode.learning_activities.length > 1;
      },
      hasSingleActivity() {
        return this.hasSomeActivities && this.contentNode.learning_activities.length === 1;
      },
      firstActivity() {
        if (!this.hasSomeActivities) {
          return null;
        }
        return this.contentNode.learning_activities[0];
      },
      displayMinutes() {
        return (
          this.contentNode.duration &&
          this.hasSingleActivity &&
          [LearningActivities.WATCH, LearningActivities.LISTEN].includes(this.firstActivity)
        );
      },
      isShortActivity() {
        return this.contentNode.duration && this.contentNode.duration < 1800;
      },
      durationEstimation() {
        if (this.hasSingleActivity && this.firstActivity === LearningActivities.READ) {
          return this.coreString('readReference');
        }
        if (!this.contentNode.duration) {
          return '';
        }
        if (this.hasMultipleActivities) {
          return this.isShortActivity
            ? this.coreString('shortActivity')
            : this.coreString('longActivity');
        }
        if (
          this.hasSingleActivity &&
          [
            LearningActivities.CREATE,
            LearningActivities.REFLECT,
            LearningActivities.PRACTICE,
            LearningActivities.EXPLORE,
          ].includes(this.firstActivity)
        ) {
          return this.isShortActivity
            ? this.coreString('shortActivity')
            : this.coreString('longActivity');
        }
        return '';
      },
      label() {
        if (!this.hasSomeActivities || this.hasMultipleActivities) {
          return '';
        }
        return this.LearningActivityToLabelMap[this.contentNode.learning_activities[0]];
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
