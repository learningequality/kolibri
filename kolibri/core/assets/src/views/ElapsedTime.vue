<template>

  <span v-if="date">
    {{ $formatRelative(date, { now: now }) }}
  </span>
  <KEmptyPlaceholder v-else />

</template>


<script>

  import { now } from 'kolibri.utils.serverClock';
  import KEmptyPlaceholder from 'kolibri.coreVue.components.KEmptyPlaceholder';

  export default {
    name: 'ElapsedTime',
    components: {
      KEmptyPlaceholder,
    },
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
