<template>

  <core-modal
    :title="$tr('deleteUser')"
    @cancel="closeModal()"
  >
    <div>
      <span v-html="formattedDeleteConfirmation"> </span>
      <p v-html="formattedDeleteWarning"> </p>
    
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
    </div>
  </core-modal>

</template>


<script>

  import { deleteUser, displayModal } from '../../state/actions';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';

  function bold(stringToBold) {
    return `<strong v-html> ${stringToBold} </strong>`;
  }

  export default {
    name: 'deleteUserModal',
    $trs: {
      deleteUser: 'Delete user',
      deleteConfirmation: 'Are you sure you want to delete user { username }?',
      deleteWarning: 'All the learning records for { username } will be lost.',
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
    computed: {
      formattedDeleteConfirmation() {
        return this.$tr('deleteConfirmation', {
          username: bold(this.username),
        });
      },
      formattedDeleteWarning() {
        return this.$tr('deleteWarning', {
          username: bold(this.username),
        });
      },
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


<style lang="stylus" scoped>

  p
    word-break: keep-all

</style>
