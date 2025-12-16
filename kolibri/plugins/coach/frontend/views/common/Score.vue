<template>

  <span>
    <KEmptyPlaceholder v-if="value === undefined || value === null" />
    <template v-else>{{ $formatNumber(value, { style: 'percent' }) }}</template>
    &nbsp;
    <span
      v-if="diff"
      :style="diffStyle"
    >{{ diffDisplay }}</span>
    <KEmptyPlaceholder
      v-else-if="diff === 0"
      :style="diffStyle"
    />
  </span>

</template>


<script>

  import { currentLanguage } from 'kolibri/utils/i18n';
  import { coachStringsMixin } from './commonCoachStrings';

  export default {
    name: 'Score',
    mixins: [coachStringsMixin],
    props: {
      value: {
        type: Number,
        default: null,
        validator(value) {
          return value >= 0 && value <= 1;
        },
      },
      diff: {
        type: Number,
        default: null,
        validator(value) {
          return value >= -1 && value <= 1;
        },
      },
    },
    computed: {
      diffStyle() {
        if (!this.diff) {
          return { color: this.$themeTokens.annotation };
        }
        if (this.diff > 0) {
          return { color: this.$themeTokens.correct };
        }
        if (this.diff < 0) {
          return { color: this.$themeTokens.incorrect };
        }
        return {};
      },
      diffDisplay() {
        if (this.diff) {
          return this.diffFormatter.format(this.diff);
        }
        return null;
      },
    },
    beforeCreate() {
      // We have to do this, as our current version of vue-intl doesn't support signDisplay
      // for number formatting.
      // Neither does IE11, so this will be slightly degraded there.
      // Not doing this via string concatenation as different number systems have different rules
      // for how to display the sign (especially in combintion with percent).
      // For example, Eastern Arabic numerals, in spite being for an RTL language,
      // positions the minus sign to the left of the number,
      // the same as in Western Arabic numberals.
      // The percent sign is also displayed to the left the opposite of Western Arabic numerals.
      this.diffFormatter = Intl.NumberFormat(currentLanguage, {
        style: 'percent',
        signDisplay: 'always',
      });
    },
  };

</script>


<style lang="scss" scoped></style>
