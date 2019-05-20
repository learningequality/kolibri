<template>

  <KModal
    :title="$tr('deleteUser')"
    :submitText="$tr('delete')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @submit="handleDeleteUser"
    @cancel="$emit('cancel')"
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
    components: {
      KModal,
    },
    props: {
      id: {
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
      ...mapActions('userManagement', ['deleteUser']),
      handleDeleteUser() {
        this.submitting = true;
        this.deleteUser(this.id);
      },
    },
    $trs: {
      deleteUser: 'Delete user',
      confirmation: "Are you sure you want to delete the user '{ username }'?",
      warning: 'All data and logs for this user will be lost.',
      cancel: 'Cancel',
      delete: 'Delete',
    },
  };

</script>


<style lang="scss" scoped></style>
