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
    name: 'LearnerProgressRatio',
    components: {
      StatusIcon,
      LabeledIcon,
    },
    mixins: [statusStringsMixin],
    props: {
      total: {
        type: Number,
        required: true,
      },
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
          return coachStrings.$tr('ratioShort', { value: this.count, total: this.total });
        }
        if (this.count === this.total && this.total > 2 && this.verb != 'notStarted') {
          return this.translations.learnerProgress[this.verb].$tr(
            this.shorten('allOfMoreThanTwo', this.verbosityNumber),
            {
              total: this.total,
            }
          );
        }
        return this.translations.learnerProgress[this.verb].$tr(
          this.shorten('ratio', this.verbosityNumber),
          {
            count: this.count,
            total: this.total,
          }
        );
      },
    },
  };

</script>


<style lang="scss" scoped></style>
