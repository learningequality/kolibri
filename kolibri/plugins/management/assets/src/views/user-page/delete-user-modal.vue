<template>

  <core-modal :title="$tr('deleteUser')" @cancel="displayModal(false)">
    <div>
      {{ $tr('deleteConfirmation', { username }) }}
      <div class="ta-r">
        <k-button
          :text="$tr('no')"
          :primary="false"
          appearance="flat-button"
          @click="displayModal(false)"
        />
        <k-button
          :text="$tr('yes')"
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

  export default {
    name: 'deleteUserModal',
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
    },
    vuex: {
      actions: {
        deleteUser,
        displayModal,
      },
    },
    $trs: {
      deleteUser: 'Delete user',
      deleteConfirmation: 'Are you sure you want to delete { username }?',
      no: 'No',
      yes: 'Yes',
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .ta-r
    text-align: right

</style>
