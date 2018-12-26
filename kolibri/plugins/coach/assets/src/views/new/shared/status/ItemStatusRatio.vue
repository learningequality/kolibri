<template>

  <LabeledIcon :label="text">
    <StatusIcon :icon="icon" />
  </LabeledIcon>

</template>


<script>

  import LabeledIcon from '../LabeledIcon';
  import { coachStrings } from '../commonCoachStrings';
  import StatusIcon from './StatusIcon';
  import { statusStringsMixin, isValidObject, isValidAdjective } from './statusStrings';

  export default {
    name: 'ItemStatusRatio',
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
          return coachStrings.$tr('ratioShort', { value: this.count, total: this.total });
        }
        if (this.count === this.total && this.total > 2) {
          return this.translations.itemStatus[this.obj][this.adjective].$tr(
            this.shorten('allOfMoreThanTwo', this.verbosityNumber),
            {
              count: this.count,
            }
          );
        }
        return this.translations.itemStatus[this.obj][this.adjective].$tr(
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
