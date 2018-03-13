<template>

  <core-modal
    :title="modalTitle"
    @cancel="closeModal()"
  >
    <form @submit.prevent="changeStatus">
      <p>{{ modalDescription }}</p>
      <k-radio-button
        :label="$tr('activeOption')"
        :radiovalue="true"
        v-model="activeIsSelected"
      />
      <k-radio-button
        :label="$tr('inactiveOption')"
        :radiovalue="false"
        v-model="activeIsSelected"
      />

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="closeModal()"
        />
        <k-button
          type="submit"
          :text="$tr('save')"
          :primary="true"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'assignmentChangeStatusModal',
    components: {
      coreModal,
      kButton,
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
