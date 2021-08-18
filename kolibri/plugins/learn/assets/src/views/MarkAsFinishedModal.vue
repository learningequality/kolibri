<template>

  <KModal
    v-if="id"
    data-test="mark-finished-modal"
    :title="$tr('markResourceAsCompleteLabel')"

    :submitText="coreString('confirmAction')"
    :cancelText="coreString('cancelAction')"
    @submit="markResourceAsCompleted"
    @cancel="id = null"
  >
    {{ $tr('markResourceAsCompleteConfirmation') }}
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'MarkAsFinishedModal',
    mixins: [commonCoreStrings],
    props: {
      /*
       * The id of the log to set to 1.0 progress
       * Modal is shown when this value is truthy
       */
      contentSessionLogId: {
        type: String,
        default: null,
      },
    },
    data() {
      return { id: this.contentSessionLogId };
    },
    methods: {
      markResourceAsCompleted() {
        this.$store
          .dispatch('saveContentSessionLog', { id: this.id, data: { progress: 1 } })
          .then(() => (this.id = null));
      },
    },
    $trs: {
      markResourceAsCompleteLabel: {
        message: 'Mark resource as complete',
        context:
          'Title of the modal window where a user will confirm or cancel marking a resource as complete manually',
      },
      markResourceAsCompleteConfirmation: {
        message: 'Are you sure you want to mark this resource as finished?',
        context:
          "The text asking the user to confirm that they want to manually mark the resource as complete, regardless of whether they've hit the 'completion criteria'",
      },
    },
  };

</script>
