<template>

  <core-modal
    :title="title"
    @cancel="closeModal()"
  >
    <p>{{ description }}</p>
    <form
      @submit.prevent.once="$emit('delete')"
      class="core-modal-buttons"
    >      <k-button
      :text="$tr('cancel')"
      appearance="flat-button"
      @click="closeModal()"
    />
      <k-button
        :text="$tr('delete')"
        :primary="true"
        type="submit"
      />
    </form>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'assignmentDeleteModal',
    components: {
      coreModal,
      kButton,
    },
    props: {
      title: {
        type: String,
        required: true,
      },
      description: {
        type: String,
        required: true,
      },
    },
    methods: {
      closeModal() {
        return this.$emit('cancel');
      },
    },
    $trs: {
      cancel: 'Cancel',
      delete: 'Delete',
    },
  };

</script>


<style lang="stylus" scoped></style>
