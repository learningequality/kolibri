<template>

  <KModal
    :title="modalTitle"
    :submitText="coreCommon$tr('deleteAction')"
    :cancelText="coreCommon$tr('cancelAction')"
    @submit="$emit('submit')"
    @cancel="$emit('cancel')"
  >
    <p>{{ modalDescription }}</p>
    <p v-if="modalConfirmation">
      {{ modalConfirmation }}
    </p>
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';
  import { coachStringsMixin } from '../../common/commonCoachStrings';

  export default {
    name: 'AssignmentDeleteModal',
    components: {
      KModal,
    },
    mixins: [coachStringsMixin, coreStringsMixin],
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
        required: false,
      },
    },
  };

</script>


<style lang="scss" scoped></style>
