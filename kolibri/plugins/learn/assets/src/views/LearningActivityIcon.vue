<template>

  <KIcon :icon="icon" />

</template>


<script>

  import { LearningActivities } from 'kolibri.coreVue.vuex.constants';

  const LearningActivityKindToIconMap = {
    [LearningActivities.CREATE]: 'create',
    [LearningActivities.LISTEN]: 'listen',
    [LearningActivities.REFLECT]: 'reflect',
    [LearningActivities.PRACTICE]: 'practice',
    [LearningActivities.READ]: 'read',
    [LearningActivities.WATCH]: 'watch',
    [LearningActivities.EXPLORE]: 'interact',
  };

  export default {
    name: 'LearningActivityIcon',
    props: {
      /**
       * Learning activity constant
       */
      kind: {
        type: String,
        required: true,
        validator(value) {
          return Object.values(LearningActivities).includes(value);
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
        const icon = LearningActivityKindToIconMap[this.kind];
        if (this.shaded) {
          return icon + 'Shaded';
        }
        return icon + 'Solid';
      },
    },
  };

</script>
