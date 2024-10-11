<template>

  <KModal
    :title="modalTitle"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ modalDescription }}</p>
    <p v-if="modalConfirmation">
      {{ modalConfirmation }}
    </p>
    <p v-if="cannotUndoActionWarning">
      {{ cannotUndoActionWarning }}
    </p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'AssignmentDeleteModal',
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      modalTitle: {
        type: String,
        required: true,
      },
      modalDescription: {
        type: String,
        required: true,
      },
      modalConfirmation: {
        type: String,
        default: null,
      },
      cannotUndoActionWarning: {
        type: String,
        default: null,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
