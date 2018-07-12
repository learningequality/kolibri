<template>

  <k-modal
    :title="$tr('deleteUser')"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="handleDeleteUser"
    @cancel="closeModal"
  >
    <p>{{ $tr('confirmation', { username: username }) }}</p>
    <p>{{ $tr('warning', { username: username }) }}</p>
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import kModal from 'kolibri.coreVue.components.kModal';

  export default {
    name: 'deleteUserModal',
    $trs: {
      deleteUser: 'Delete user',
      confirmation: "Are you sure you want to delete '{ username }'?",
      warning: "All the learning records for '{ username }' will be lost.",
      cancel: 'Cancel',
      delete: 'Delete',
    },
    components: {
      kModal,
    },
    props: {
      id: {
        type: String,
        required: true,
      },
      name: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        submitting: false,
      };
    },
    methods: {
      ...mapActions(['deleteUser', 'displayModal']),
      handleDeleteUser() {
        this.submitting = true;
        this.deleteUser(this.id);
      },
      closeModal() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="scss" scoped></style>
