<template>

  <mat-svg
    v-if="icon === ICONS.clock"
    category="device"
    name="access_time"
    :style="{ fill: $coreStatusProgress }"
  />
  <mat-svg
    v-else-if="icon === ICONS.star"
    category="action"
    name="stars"
    :style="{ fill: $coreStatusMastered }"
  />
  <mat-svg
    v-else-if="icon === ICONS.help"
    category="alert"
    name="error"
    :style="{ fill: $coreStatusWrong }"
  />
  <mat-svg
    v-else-if="icon === ICONS.learners"
    category="social"
    name="people"
  />
  <mat-svg
    v-else-if="icon === ICONS.nothing"
    category="content"
    name="remove_circle"
    :style="{ fill: $coreGrey200 }"
  />

</template>


<script>

  import { mapGetters } from 'vuex';
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
      ...mapGetters([
        '$coreStatusMastered',
        '$coreStatusProgress',
        '$coreStatusWrong',
        '$coreGrey200',
      ]),
      ICONS() {
        return ICONS;
      },
    },
  };

</script>


<style lang="scss" scoped></style>
