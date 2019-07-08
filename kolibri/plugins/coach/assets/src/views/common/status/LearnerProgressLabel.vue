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

  import { coachStringsMixin } from '../commonCoachStrings'; // eslint-disable-line no-unused-vars
  import CoachStatusIcon from './CoachStatusIcon';
  import { statusStringsMixin, isValidVerb } from './statusStrings';

  export default {
    name: 'LearnerProgressLabel',
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
      answeredQuestionsCount: {
        type: Number,
        required: false,
        default: null,
      },
      totalQuestionsCount: {
        type: Number,
        required: false,
        default: null,
      },
    },
    computed: {
      strings() {
        return this.translations.learnerProgress[this.verb];
      },
      text() {
        if (!this.verbosityNumber) {
          return '';
        }
        if (this.totalQuestionsCount !== null && this.answeredQuestionsCount !== null) {
          return this.strings.$tr('questionsStarted', {
            answeredQuestionsCount: `${this.answeredQuestionsCount}`,
            totalQuestionsCount: this.totalQuestionsCount,
          });
        }
        return this.strings.$tr(this.shorten('label', this.verbosityNumber), { count: this.count });
      },
      tooltip() {
        return this.strings.$tr(this.shorten('label', 2), {
          count: this.count,
        });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
