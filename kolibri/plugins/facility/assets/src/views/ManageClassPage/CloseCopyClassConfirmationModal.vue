<template>

  <KModal
    :title="coreString('closeConfirmationTitle')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('confirm')"
    @cancel="$emit('cancel')"
  >
    <p>{{ coreString('closeConfirmationMessage') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'CloseCopyClassConfirmationModal',
    mixins: [commonCoreStrings],
  };

</script>
