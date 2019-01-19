<template>

  <LabeledIcon :label="text">
    <CoachStatusIcon :icon="icon" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from '../LabeledIcon';
  import { coachStrings } from '../commonCoachStrings';
  import CoachStatusIcon from './CoachStatusIcon';
  import { statusStringsMixin, isValidObject, isValidAdjective } from './statusStrings';

  export default {
    name: 'ItemStatusCount',
    components: {
      CoachStatusIcon,
      LabeledIcon,
    },
    mixins: [statusStringsMixin],
    props: {
      obj: {
        type: String,
        required: true,
        validator: isValidObject,
      },
      adjective: {
        type: String,
        required: true,
        validator: isValidAdjective,
      },
      icon: {
        type: String,
        required: true,
      },
    },
    computed: {
      text() {
        if (!this.verbosityNumber) {
          return coachStrings.$tr('integer', { value: this.count });
        }
        return this.translations.itemStatus[this.obj][this.adjective].$tr(
          this.shorten('count', this.verbosityNumber),
          { count: this.count }
        );
      },
    },
  };

</script>


<style lang="scss" scoped></style>
