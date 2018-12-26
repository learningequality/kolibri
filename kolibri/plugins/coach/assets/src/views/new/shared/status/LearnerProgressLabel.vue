<template>

  <LabeledIcon :label="text">
    <StatusIcon :icon="icon" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from '../LabeledIcon';
  import { coachStrings } from '../commonCoachStrings';
  import StatusIcon from './StatusIcon';
  import { statusStringsMixin, isValidVerb } from './statusStrings';

  export default {
    name: 'LearnerProgressLabel',
    components: {
      StatusIcon,
      LabeledIcon,
    },
    mixins: [statusStringsMixin],
    props: {
      verb: {
        type: String,
        required: true,
        validator: isValidVerb,
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
        return this.translations.learnerProgress[this.verb].$tr(
          this.shorten('label', this.verbosityNumber),
          { count: this.count }
        );
      },
    },
  };

</script>


<style lang="scss" scoped></style>
