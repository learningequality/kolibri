<template>

  <core-modal
    :title="modalTitle"
    :submitText="$tr('save')"
    :cancelText="$tr('cancel')"
    @submit="changeStatus"
    @cancel="closeModal"
  >
    <p>{{ modalDescription }}</p>
    <k-radio-button
      :label="$tr('activeOption')"
      :value="true"
      v-model="activeIsSelected"
    />
    <k-radio-button
      :label="$tr('inactiveOption')"
      :value="false"
      v-model="activeIsSelected"
    />
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';

  export default {
    name: 'assignmentChangeStatusModal',
    components: {
      coreModal,
      kRadioButton,
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
      activeOption: 'Active',
      inactiveOption: 'Inactive',
    },
  };

</script>


<style lang="stylus" scoped></style>
