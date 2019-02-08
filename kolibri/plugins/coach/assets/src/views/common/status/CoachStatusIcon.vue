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

  import { mapGetters } from 'vuex';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import { ICONS } from './constants';

  export default {
    name: 'CoachStatusIcon',
    components: {
      KIcon,
    },
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
      ...mapGetters([
        '$coreStatusMastered',
        '$coreStatusProgress',
        '$coreStatusWrong',
        '$coreGrey300',
      ]),
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
      },
    },
  };

</script>


<style lang="scss" scoped></style>
