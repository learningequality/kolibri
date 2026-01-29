<template>

  <div>
    <KLabeledIcon nowrap>
      <template #icon>
        <CoachStatusIcon
          ref="status"
          :icon="icon"
        />
      </template>
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
    name: 'LearnerProgressCount',
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
      showRatioInTooltip: {
        type: Boolean,
        default: false,
      },
      progress: {
        type: Object,
        default: null,
      },
    },
    computed: {
      strings() {
        return this.learnerProgressTranslators[this.verb];
      },
      hasUnitName() {
        return this.progress && this.progress.unitName;
      },
      // eslint-disable-next-line kolibri/vue-no-undefined-string-uses
      text() {
        if (!this.verbosityNumber) {
          return this.$formatNumber(this.count);
        }

        // For pre-test and post-test, use the simple label format without counts
        if (this.isTestVerb) {
          if (this.hasUnitName) {
            return this.strings.$tr('labelWithUnit', {
              unitName: this.progress.unitName,
            });
          }
          // Show just "Pre-test running" or "Post-test running" without counts
          return this.strings.$tr('labelShort');
        }

        return this.strings.$tr(this.shorten('count', this.verbosityNumber), { count: this.count });
      },
      tooltip() {
        if (this.showRatioInTooltip) {
          return this.strings.$tr(this.shorten('ratio', 2), {
            count: this.count,
            total: this.total,
          });
        }
        return this.strings.$tr(this.shorten('count', 2), { count: this.count });
      },
    },
  };

</script>


<style lang="scss" scoped></style>
