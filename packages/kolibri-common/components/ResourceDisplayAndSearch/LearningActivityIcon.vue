<template>

  <KIcon
    v-if="icon"
    :icon="icon"
  />

</template>


<script>

  import { LearningActivities } from 'kolibri/constants';

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
   * activity is provided. Will render nothing at all if given [].
   */
  export default {
    name: 'LearningActivityIcon',
    props: {
      /**
       * Learning activity constant(s)
       * Can be one constant or an array of constants
       */
      kind: {
        type: [String, Array],
        required: true,
        validator(value) {
          if (!value.length) {
            return true;
          }
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
        let icon;

        if (this.kind === undefined || this.kind === null) {
          return null;
        }

        if (Array.isArray(this.kind)) {
          if (this.kind.length === 0) {
            return null;
          }

          if (this.kind.length === 1) {
            icon = LearningActivityToIconMap[this.kind[0]];
          }

          if (this.kind.length > 1) {
            return AllActivitiesIcon;
          }
        } else {
          icon = LearningActivityToIconMap[this.kind];
        }

        return icon + (this.shaded ? 'Shaded' : 'Solid');
      },
    },
  };

</script>
