<template>

  <!-- internal spaces below are necessary for external formatting -->
  <span> {{ formatedTime }} </span>

</template>


<script>

  import { now } from 'kolibri/utils/serverClock';

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
      generatedMomentsAgo: {
        message: 'Generated moments ago.',
        context:
          "Indicates logs were generated using the 'Generate a new log file' option recently.",
      },
      generatedInPast: {
        message: 'Generated {relativeTimeAgo}.',
        context:
          "Indicates the last time logs were generated using the 'Generate a new log file' option.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
