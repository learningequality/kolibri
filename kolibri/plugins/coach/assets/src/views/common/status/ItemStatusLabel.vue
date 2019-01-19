<template>

  <LabeledIcon :label="text">
    <CoachStatusIcon :icon="icon" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from '../LabeledIcon';
  import { coachStrings } from '../commonCoachStrings'; // eslint-disable-line no-unused-vars
  import CoachStatusIcon from './CoachStatusIcon';
  import { statusStringsMixin, isValidObject, isValidAdjective } from './statusStrings';

  export default {
    name: 'ItemStatusLabel',
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
          return '';
        }
        return this.translations.itemStatus[this.obj][this.adjective].$tr(
          this.shorten('label', this.verbosityNumber),
          { count: this.count }
        );
      },
    },
  };

</script>


<style lang="scss" scoped></style>
