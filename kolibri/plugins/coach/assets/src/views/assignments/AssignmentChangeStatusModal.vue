<template>

  <KModal
    :title="modalTitle"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    @submit="changeStatus"
    @cancel="closeModal"
  >
    <p>{{ modalDescription }}</p>
    <KRadioButton
      v-model="activeIsSelected"
      :label="modalActiveOption"
      :value="true"
    />
    <KRadioButton
      v-model="activeIsSelected"
      :label="modalInactiveOption"
      :value="false"
    />
  </KModal>

</template>


<script>

  import KModal from 'kolibri.coreVue.components.KModal';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';

  export default {
    name: 'AssignmentChangeStatusModal',
    components: {
      KModal,
      KRadioButton,
    },
    props: {
      modalTitle: {
        type: String,
        required: true,
      },
      modalDescription: {
        type: String,
        required: true,
      },
      modalActiveOption: {
        type: String,
        required: true,
      },
      modalInactiveOption: {
        type: String,
        required: true,
      },
      active: {
        type: Boolean,
        required: true,
      },
    },
    data() {
      return {
        activeIsSelected: null,
      };
    },
    computed: {
      statusHasChanged() {
        return this.activeIsSelected !== this.active;
      },
    },
    created() {
      this.activeIsSelected = this.active;
    },
    methods: {
      closeModal() {
        return this.$emit('cancel');
      },
      changeStatus() {
        // If status has not changed, do nothing
        if (!this.statusHasChanged) {
          return this.closeModal();
        }
        this.$emit('changeStatus', this.activeIsSelected);
      },
    },
    $trs: {
      save: 'Save',
      cancel: 'Cancel',
    },
  };

</script>


<style lang="scss" scoped></style>
