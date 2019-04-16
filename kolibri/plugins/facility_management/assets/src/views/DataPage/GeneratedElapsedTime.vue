<template>

  <!-- internal spaces below are necessary for external formatting -->
  <span> {{ formatedTime }} </span>

</template>


<script>

  import { now } from 'kolibri.utils.serverClock';

  export default {
    name: 'GeneratedElapsedTime',
    props: {
      date: {
        type: Date,
        required: true,
      },
    },
    data: () => ({
      now: now(),
      timer: null,
    }),
    computed: {
      formatedTime() {
        if (this.now - this.date < 10000) {
          return this.$tr('generatedMomentsAgo');
        }
        return this.$tr('generatedInPast', {
          relativeTimeAgo: this.$formatRelative(this.date, { now: this.now }),
        });
      },
    },
    mounted() {
      this.timer = setInterval(() => {
        this.now = now();
      }, 60000);
    },
    beforeDestroy() {
      clearInterval(this.timer);
    },
    $trs: {
      generatedMomentsAgo: 'Generated moments ago.',
      generatedInPast: 'Generated {relativeTimeAgo}.',
    },
  };

</script>


<style lang="scss" scoped></style>
