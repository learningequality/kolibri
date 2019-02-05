<template>

  <div>
    <LabeledIcon :label="text">
      <CoachStatusIcon ref="status" :icon="icon" />
    </LabeledIcon>
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

  import KTooltip from 'kolibri.coreVue.components.KTooltip';
  import LabeledIcon from '../LabeledIcon';
  import { coachStrings } from '../commonCoachStrings'; // eslint-disable-line no-unused-vars
  import CoachStatusIcon from './CoachStatusIcon';
  import { statusStringsMixin, isValidVerb } from './statusStrings';

  export default {
    name: 'LearnerProgressLabel',
    components: {
      CoachStatusIcon,
      LabeledIcon,
      KTooltip,
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
      strings() {
        return this.translations.learnerProgress[this.verb];
      },
      text() {
        if (!this.verbosityNumber) {
          return '';
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
