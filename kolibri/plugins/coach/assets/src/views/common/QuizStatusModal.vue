<template>

  <KModal
    :title="modalHeader"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    @cancel="$emit('cancel')"
    @submit="$emit('submit')"
  >
    <div>{{ modalDetail }}</div>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'QuizStatusModal',
    mixins: [commonCoreStrings],
    props: {
      modalHeader: {
        type: String,
        required: false,
        default: '',
      },
      modalDetail: {
        type: String,
        required: false,
        default: '',
      },
    },
  };

</script>
