<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="false"
    @cancel="close"
  >
    <div>
      <span v-html="formattedDeleteConfirmation"> </span>
      <p v-html="formattedAccessReassuranceConfirmation"> </p>

      <!-- Button Section TODO: cleaunup -->
      <section>

        <icon-button
          :text="$tr('cancel')"
          class="undo-btn"
          @click="close"
        />

        <icon-button
          :text="$tr('remove')"
          class="confirm-btn"
          :primary="true"
          @click="userRemove"
        />

      </section>

    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  function bold(stringToBold) {
    return `<strong v-html> ${stringToBold} </strong>`;
  }
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  export default {
    $trNameSpace: 'userRemoveModal',
    $trs: {
      modalTitle: 'Remove User from Class',
      remove: 'Remove from Class',
      cancel: 'Cancel',
      deleteConfirmation: 'Are you sure you want to remove { username } from { classname }?',
      accessReassurance: 'You can still access this account from { sectionTabName }',
      usersTab: 'Users',
    },
    components: {
      iconButton,
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
        removeClassUser: actions.removeClassUser,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .confirm-btn, .undo-btn
    width: 48%

  .confirm-btn
    float: right

  .header
    text-align: center

  p
    word-break: keep-all

</style>
