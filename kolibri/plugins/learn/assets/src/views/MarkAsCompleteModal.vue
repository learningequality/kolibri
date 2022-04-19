<template>

  <KModal
    :title="learnString('markResourceAsCompleteLabel')"
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
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'MarkAsCompleteModal',
    mixins: [commonCoreStrings, commonLearnStrings],
    methods: {
      /*
       * Emits "complete" event on success.
       * Errors handled using the `handleApiError` action.
       */
      markResourceAsCompleted() {
        this.$store
          .dispatch('updateContentSession', { progress: 1 })
          .then(() => {
            this.$emit('complete');
            this.$store.dispatch('createSnackbar', this.learnString('resourceCompletedLabel'));
          })
          .catch(e => this.$store.dispatch('handleApiError', e));
      },
    },
    $trs: {
      markResourceAsCompleteConfirmation: {
        message: 'Are you sure you want to mark this resource as completed?',
        context:
          "The text asking the user to confirm that they want to manually mark the resource as complete, regardless of whether they've hit the 'completion criteria'",
      },
    },
  };

</script>
