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
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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
            this.$store.dispatch(
              'createSnackbar',
              this.$tr('userDeletedNotification', { username: this.username })
            );
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
          });
      },
    },
    $trs: {
      deleteUser: 'Delete user',
      confirmation: "Are you sure you want to delete the user '{ username }'?",
      warning: 'All data and logs for this user will be lost.',
      userDeletedNotification: "User account for '{username}' was deleted",
    },
  };

</script>


<style lang="scss" scoped></style>
