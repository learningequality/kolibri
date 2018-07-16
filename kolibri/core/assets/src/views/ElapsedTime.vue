<template>

  <span>
    <template v-if="date">{{ $formatRelative(date, { now: now }) }}</template>
    <template v-else>–</template>
  </span>

</template>


<script>

  import { now } from 'kolibri.utils.serverClock';

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
