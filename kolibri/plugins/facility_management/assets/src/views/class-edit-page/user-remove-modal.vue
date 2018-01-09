<template>

  <core-modal
    :title="$tr('modalTitle')"
    :hasError="false"
    @cancel="close"
  >
    <div>
      <span v-html="formattedDeleteConfirmation"> </span>
      <p v-html="formattedAccessReassuranceConfirmation"> </p>

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="close"
        />
        <k-button
          :text="$tr('remove')"
          :primary="true"
          @click="userRemove"
        />
      </div>

    </div>
  </core-modal>

</template>


<script>

  import { removeClassUser, displayModal } from '../../state/actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';

  function bold(stringToBold) {
    return `<strong v-html> ${stringToBold} </strong>`;
  }

  export default {
    name: 'userRemoveModal',
    $trs: {
      modalTitle: 'Remove User from Class',
      remove: 'Remove from Class',
      cancel: 'Cancel',
      deleteConfirmation: 'Are you sure you want to remove { username } from { classname }?',
      accessReassurance: 'You can still access this account from { sectionTabName }',
      usersTab: 'Users',
    },
    components: {
      kButton,
      coreModal,
    },
    props: {
      classname: {
        type: String,
        required: true,
      },
      username: {
        type: String,
        required: true,
      },
      classid: {
        type: String,
        required: true,
      },
      userid: {
        type: String,
        required: true,
      },
    },
    computed: {
      formattedDeleteConfirmation() {
        return this.$tr('deleteConfirmation', {
          username: bold(this.username),
          classname: bold(this.classname),
        });
      },
      formattedAccessReassuranceConfirmation() {
        return this.$tr('accessReassurance', {
          sectionTabName: bold(this.$tr('usersTab')),
        });
      },
    },
    methods: {
      userRemove() {
        this.removeClassUser(this.classid, this.userid);
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        removeClassUser,
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  p
    word-break: keep-all

</style>
