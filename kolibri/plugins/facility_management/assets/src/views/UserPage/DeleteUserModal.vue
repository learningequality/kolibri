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

  import { mapActions } from 'vuex';
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
    },
  };

</script>


<style lang="scss" scoped></style>
