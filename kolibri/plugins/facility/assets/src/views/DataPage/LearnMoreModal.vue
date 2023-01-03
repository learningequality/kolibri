<template>

  <KModal
    :title="logType === 'summary' ? $tr('summaryLogs') : $tr('sessionLogs')"
    :submitText="$tr('close')"
    size="medium"
    @cancel="closeModal"
    @submit="closeModal"
  >
    <p class="description">
      {{ getMessage() }}
    </p>
  </KModal>

</template>


<script>

  export default {
    name: 'LearnMoreModal',
    props: {
      logType: {
        type: String,
        required: true,
      },
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
      getMessage() {
        let message = '';
        if (this.logType === 'summary') {
          message = this.$tr('summaryLogText');
        } else if (this.logType === 'session') {
          message = this.$tr('sessionLogText');
        }
        return message;
      },
    },
    $trs: {
      summaryLogs: {
        message: 'Summary Logs',
        context: 'Title for Summary logs description',
      },
      sessionLogs: {
        message: 'Session Logs',
        context: 'Title for Session logs description',
      },
      summaryLogText: {
        message:
          'A user may visit the same resource multiple times. This file records the total time and progress each user has achieved for each resource, summarized across possibly more than one visit. Anonymous usage is not included.',
        context:
          "Text description on the 'Learn More' pop-up window in the Facility > Data > Export usage data section.\n",
      },
      sessionLogText: {
        message:
          'When a user views a resource, we record how long they spend and the progress they make. Each row in this file records a single visit a user made to a specific resource. This includes anonymous usage, when no user is signed in.',
        context:
          "Text description on the 'Learn More' pop-up window in the Facility > Data > Export usage data section.\n",
      },
      close: {
        message: 'Close',
        context:
          "Refers to the 'Close' button on the 'Learn More' pop-up window in the Facility > Data > Export usage data section.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>
