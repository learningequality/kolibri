<template>

  <div>
    <KLabeledIcon nowrap>
      <CoachStatusIcon slot="icon" ref="status" :icon="icon" />
      {{ text }}
    </KLabeledIcon>
    <KTooltip
      v-if="false"
      reference="status"
      placement="top"
      :refs="$refs"
    >
      {{ tooltip }}
    </KTooltip>
  </div>

</template>


<script>

  import { coachStringsMixin } from '../commonCoachStrings';
  import CoachStatusIcon from './CoachStatusIcon';
  import { statusStringsMixin, isValidVerb } from './statusStrings';

  export default {
    name: 'LearnerProgressRatio',
    components: {
      CoachStatusIcon,
    },
    mixins: [statusStringsMixin, coachStringsMixin],
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
      strings() {
        return this.translations.learnerProgress[this.verb];
      },
      text() {
        if (!this.verbosityNumber) {
          return this.coachString('ratioShort', { value: this.count, total: this.total });
        }
        if (this.count === this.total && this.total > 2 && this.verb != 'notStarted') {
          return this.strings.$tr(this.shorten('allOfMoreThanTwo', this.verbosityNumber), {
            total: this.total,
          });
        }
        return this.strings.$tr(this.shorten('ratio', this.verbosityNumber), {
          count: this.count,
          total: this.total,
        });
      },
      tooltip() {
        return this.strings.$tr(this.shorten('ratio', 2), {
          count: this.count,
          total: this.total,
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
