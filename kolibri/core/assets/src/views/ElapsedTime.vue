<template>

  <span v-if="date">
    {{ $formatRelative(date, { now: now }) }}
  </span>
  <span v-else :style="{ color: this.$coreGrey300 }">–</span>

</template>


<script>

  import { now } from 'kolibri.utils.serverClock';
  import { mapGetters } from 'vuex';

  export default {
    name: 'ElapsedTime',
    props: {
      date: {
        type: Date,
      },
    },
    data: () => ({
      now: now(),
      timer: null,
    }),
    computed: {
      ...mapGetters(['$coreGrey300']),
    },
    mounted() {
      this.timer = setInterval(() => {
        this.now = now();
      }, 10000);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    },
  };

</script>


<style lang="scss" scoped></style>
