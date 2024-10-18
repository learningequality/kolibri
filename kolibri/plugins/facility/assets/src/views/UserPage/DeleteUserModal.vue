<template>

  <KModal
    :title="$tr('deleteUser')"
    :submitText="coreString('deleteAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="submitting"
    @submit="handleDeleteUser"
    @cancel="$emit('cancel')"
  >
    <p>{{ $tr('confirmation', { username: username }) }}</p>
    <p>{{ $tr('warning', { username: username }) }}</p>
    <p>{{ coreString('cannotUndoActionWarning') }}</p>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'DeleteUserModal',
    mixins: [commonCoreStrings],
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
      handleDeleteUser() {
        this.submitting = true;
        this.$store
          .dispatch('userManagement/deleteFacilityUser', { userId: this.id })
          .then(() => {
            this.$store.commit('userManagement/DELETE_USER', this.id);
            this.$emit('cancel');
            this.showSnackbarNotification('userDeleted');
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', { error });
          });
      },
    },
    $trs: {
      deleteUser: {
        message: 'Delete user',
        context:
          'Title for the window where a user can confirm if they want to delete another user.',
      },
      confirmation: {
        message: "Are you sure you want to delete the user '{ username }'?",
        context: "Conformation message that displays in the 'Delete user' window.",
      },
      warning: {
        message: 'All data and logs for this user will be lost.',
        context: "Warning information on 'Delete user' window.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
