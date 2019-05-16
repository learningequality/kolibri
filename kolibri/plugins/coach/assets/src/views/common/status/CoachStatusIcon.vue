<template>

  <KIcon
    :inProgress="icon === ICONS.clock"
    :mastered="icon === ICONS.star"
    :helpNeeded="icon === ICONS.help"
    :notStarted="icon === ICONS.nothing"
    :color="color"
  />

</template>


<script>

  import KIcon from 'kolibri.coreVue.components.KIcon';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import { ICONS } from './constants';

  export default {
    name: 'CoachStatusIcon',
    components: {
      KIcon,
    },
    mixins: [themeMixin],
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
      ICONS() {
        return ICONS;
      },
      color() {
        if (this.icon === ICONS.clock) {
          return this.$coreStatusProgress;
        }
        if (this.icon === ICONS.star) {
          return this.$coreStatusMastered;
        }
        if (this.icon === ICONS.help) {
          return this.$coreStatusWrong;
        }
        if (this.icon === ICONS.nothing) {
          return this.$coreGrey300;
        }

        return undefined;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
