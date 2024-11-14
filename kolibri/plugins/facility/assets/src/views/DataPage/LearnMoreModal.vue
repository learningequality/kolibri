<template>

  <KModal
    :title="modalTitle"
    :submitText="coreString('closeAction')"
    size="medium"
    @cancel="closeModal"
    @submit="closeModal"
  >
    <p class="description">
      {{ modalMessage }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'LearnMoreModal',
    mixins: [commonCoreStrings],
    props: {
      logType: {
        type: String,
        required: true,
        validator(value) {
          return ['summary', 'session'].includes(value);
        },
      },
    },
    computed: {
      modalTitle() {
        return this.logType === 'summary' ? this.$tr('summaryLogs') : this.$tr('sessionLogs');
      },
      modalMessage() {
        return this.logType === 'summary' ? this.$tr('summaryLogText') : this.$tr('sessionLogText');
      },
    },
    methods: {
      closeModal() {
        this.$emit('cancel');
      },
    },
    $trs: {
      summaryLogs: {
        message: 'Summary logs',
        context: 'Title for Summary logs description',
      },
      sessionLogs: {
        message: 'Session logs',
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
    },
  };

</script>


<style lang="scss" scoped>

  .description {
    margin-top: 0;
  }

</style>
