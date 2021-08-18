<template>

  <KModal
    v-if="contentSessionLogId"
    :title="$tr('markResourceAsCompleteLabel')"
    :submitText="coreString('confirmAction')"
    :cancelText="coreString('cancelAction')"
    @submit="markResourceAsCompleted"
    @cancel="$emit('cancel')"
  >
    {{ $tr('markResourceAsCompleteConfirmation') }}
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { ContentSessionLogResource } from 'kolibri.resources';

  export default {
    name: 'MarkAsFinishedModal',
    mixins: [commonCoreStrings],
    props: {
      // When truthy, the modal is shown. It is the implementer's charge
      // to decide when this is visible. The `complete` event will be
      // emitted upon successful API request in markResourceAsCompleted().
      contentSessionLogId: {
        type: String,
        default: null,
      },
    },
    methods: {
      /*
       * Emits "complete" event on success.
       * Errors handled using the `handleApiError` action.
       */
      markResourceAsCompleted() {
        ContentSessionLogResource.saveModel({
          id: this.contentSessionLogId,
          data: {
            progress: 1,
          },
          exists: true,
        })
          .then(() => {
            this.$emit('complete');
            this.$store.dispatch('createSnackbar', this.$tr('resourceCompletedSnackbar'));
          })
          .catch(e => this.$store.dispatch('handleApiError', e));
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
      resourceCompletedSnackbar: {
        message: 'Resource completed',
        context:
          'When the user successfully marks a resource as complete, they will see a small snackbar pop up showing this message.',
      },
    },
  };

</script>
