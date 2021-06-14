<template>

  <KIcon :icon="icon" />

</template>


<script>

  import { LearningActivityKinds } from 'kolibri.coreVue.vuex.constants';

  const LearningActivityKindToIconMap = {
    [LearningActivityKinds.CREATE]: 'create',
    [LearningActivityKinds.LISTEN]: 'listen',
    [LearningActivityKinds.REFLECT]: 'reflect',
    [LearningActivityKinds.PRACTICE]: 'practice',
    [LearningActivityKinds.READ]: 'read',
    [LearningActivityKinds.WATCH]: 'watch',
    [LearningActivityKinds.EXPLORE]: 'interact',
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
          return Object.values(LearningActivityKinds).includes(value);
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
