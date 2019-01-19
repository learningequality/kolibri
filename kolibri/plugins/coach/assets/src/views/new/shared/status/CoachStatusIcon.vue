<template>

  <mat-svg
    v-if="icon === 'clock'"
    category="device"
    name="access_time"
    :style="{ fill: $coreStatusProgress }"
  />
  <mat-svg
    v-else-if="icon === 'star'"
    category="action"
    name="stars"
    :style="{ fill: $coreStatusMastered }"
  />
  <mat-svg
    v-else-if="icon === 'help'"
    category="alert"
    name="error"
    :style="{ fill: $coreStatusWrong }"
  />
  <mat-svg
    v-else-if="icon === 'learners'"
    category="social"
    name="people"
  />
  <mat-svg
    v-else-if="icon === 'nothing'"
    category="content"
    name="remove_circle"
    :style="{ fill: $coreGrey200 }"
  />

</template>


<script>

  import { mapGetters } from 'vuex';

  export default {
    name: 'CoachStatusIcon',
    props: {
      icon: {
        type: String,
        required: true,
        validator(value) {
          return ['clock', 'star', 'help', 'learners', 'nothing'].includes(value);
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
    },
  };

</script>


<style lang="scss" scoped></style>
