<template>

  <core-modal
    :title="$tr('deleteUser')"
    @cancel="closeModal()"
  >
    <p>{{ $tr('confirmation', { username: username }) }}</p>
    <p>{{ $tr('warning', { username: username }) }}</p>
  
    <div class="core-modal-buttons">
      <k-button
        :text="$tr('cancel')"
        :primary="false"
        appearance="flat-button"
        @click="closeModal()"
      />
      <k-button
        :text="$tr('delete')"
        :primary="true"
        appearance="raised-button"
        :disabled="submitting"
        @click="handleDeleteUser"
      />
    </div>
  </core-modal>

</template>


<script>

  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import { deleteUser, displayModal } from '../../state/actions';

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
      coreModal,
      kButton,
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
      handleDeleteUser() {
        this.submitting = true;
        this.deleteUser(this.id);
      },
      closeModal() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        deleteUser,
        displayModal,
      },
    },
  };

</script>


<style lang="stylus"></style>
