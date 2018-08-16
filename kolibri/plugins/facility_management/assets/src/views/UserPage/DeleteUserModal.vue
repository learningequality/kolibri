<template>

  <KModal
    :title="$tr('deleteUser')"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="handleDeleteUser"
    @cancel="closeModal"
  >
    <p>{{ $tr('confirmation', { username: username }) }}</p>
    <p>{{ $tr('warning', { username: username }) }}</p>
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';

  export default {
    name: 'DeleteUserModal',
    $trs: {
      deleteUser: 'Delete user',
      confirmation: "Are you sure you want to delete '{ username }'?",
      warning: "All the learning records for '{ username }' will be lost.",
      cancel: 'Cancel',
      delete: 'Delete',
    },
    components: {
      KModal,
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
      ...mapActions('userManagement', ['deleteUser', 'displayModal']),
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
