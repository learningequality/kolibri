<template>

  <KIcon :icon="iconType" :color="color" />

</template>


<script>

  import { ICONS } from './constants';

  export default {
    name: 'CoachStatusIcon',
    props: {
      icon: {
        type: String,
        required: true,
        validator(value) {
          return Object.values(ICONS).includes(value);
        },
      },
    },
    computed: {
      iconType() {
        return {
          [ICONS.clock]: 'inProgress',
          [ICONS.star]: 'mastered',
          [ICONS.help]: 'helpNeeded',
          [ICONS.nothing]: 'notStarted',
        }[this.icon];
      },
      color() {
        if (this.icon === ICONS.clock) {
          return this.$themeTokens.progress;
        }
        if (this.icon === ICONS.star) {
          return this.$themeTokens.mastered;
        }
        if (this.icon === ICONS.help) {
          return this.$themeTokens.incorrect;
        }
        if (this.icon === ICONS.nothing) {
          return this.$themeTokens.textDisabled;
        }

        return undefined;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
