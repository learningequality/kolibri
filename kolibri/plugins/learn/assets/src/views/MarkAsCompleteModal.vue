<template>

  <KModal
    :title="learnString('markResourceAsCompleteLabel')"
    :submitText="coreString('confirmAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('complete')"
    @cancel="$emit('cancel')"
  >
    <div v-if="!showLoading">
      {{ $tr('markResourceAsCompleteConfirmation') }}
    </div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import commonLearnStrings from './commonLearnStrings';

  export default {
    name: 'MarkAsCompleteModal',
    mixins: [commonCoreStrings, commonLearnStrings],
    data() {
      return {
        showLoading: false,
      };
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
