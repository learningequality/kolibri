<template>

  <div class="activity-chip">
    <KLabeledIcon :icon="icon" :label="coreString(kind)" class="activity-chip-label" />
  </div>

</template>


<script>

  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  const AllActivitiesIcon = 'allActivities';
  const LearningActivityToIconMap = {
    [LearningActivities.CREATE]: 'create',
    [LearningActivities.LISTEN]: 'listen',
    [LearningActivities.REFLECT]: 'reflect',
    [LearningActivities.PRACTICE]: 'practice',
    [LearningActivities.READ]: 'read',
    [LearningActivities.WATCH]: 'watch',
    [LearningActivities.EXPLORE]: 'interact',
  };

  /**
   * Displays a corresponding icon for a single learning activity
   * or an icon for more activities if more than one learning
   * activity is provided.
   */
  export default {
    name: 'LearningActivityChip',
    mixins: [commonCoreStrings],
    props: {
      /**
       * Learning activity constant(s)
       * Can be one constant or an array of constants
       */
      kind: {
        type: [String, Array],
        required: true,
        validator(value) {
          const isValidLearningActivity = v => Object.values(LearningActivities).includes(v);

          if (Array.isArray(value) && value.length > 0) {
            return value.every(isValidLearningActivity);
          } else if (typeof value === 'string') {
            return isValidLearningActivity(value);
          } else {
            return false;
          }
        },
      },
      /**
       * Icon is solid by default.
       * Set to `true` to make it shaded.
       */
      shaded: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      icon() {
        // more activities
        if (Array.isArray(this.kind) && this.kind.length > 1) {
          return AllActivitiesIcon;
        }

        let kind = this.kind;
        // one activity but as an array
        if (Array.isArray(this.kind) && this.kind.length === 1) {
          kind = this.kind[0];
        }

        const icon = LearningActivityToIconMap[kind];
        if (this.shaded) {
          return icon + 'Shaded';
        }
        return icon + 'Solid';
      },
    },
  };

</script>


<style lang="scss" scoped>

  .activity-chip {
    display: inline-block;
    padding: 12px; // Aligns with close button
    font-weight: bold;
    background-color: #f5f5f5;
    border-radius: 4px;

    /deep/ svg {
      width: 24px;
      height: 24px;
      margin-top: -4px;
      margin-left: -2px;
    }
  }

  .activity-chip-label {
    width: auto;
  }

</style>
