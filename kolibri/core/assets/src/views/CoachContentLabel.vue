<template>

  <KLabeledIcon
    v-if="value > 0"
    ref="something"
    :style="{ color: $themeTokens.coachContent }"
  >
    <KIcon
      slot="icon"
      icon="coach"
      :color="$themeTokens.coachContent"
    />
    <span v-if="isTopic" class="counter">
      {{ $formatNumber(value) }}
    </span>

    <KTooltip
      reference="something"
      placement="top"
      style="position: relative;"
      :refs="$refs"
    >
      {{ titleText }}
    </KTooltip>
  </KLabeledIcon>

</template>


<script>

  export default {
    name: 'CoachContentLabel',
    props: {
      value: {
        type: Number,
        default: 0,
      },
      // Show number next to label if a topic
      isTopic: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      titleText() {
        if (this.isTopic) {
          return this.$tr('topicTitle', { count: this.value });
        }
        return this.$tr('coachResourceLabel');
      },
    },
    $trs: {
      coachResourceLabel: 'Coach resource',
      topicTitle:
        'Contains {count, number, integer} {count, plural, one {coach resource} other {coach resources}}',
    },
  };

</script>


<style lang="scss" scoped>

  .counter {
    font-size: 11px;
  }

  .coach-mat-icon.ui-icon {
    font-size: 16px;
  }

</style>
