<template>

  <core-modal
    :title="$tr('modalTitle')"
    :hasError="false"
    @cancel="close"
  >
    <div>
      <span v-html="formattedDeleteConfirmation"> </span>
      <p v-html="formattedAccessReassuranceConfirmation"> </p>

      <!-- Button Section TODO: cleaunup -->
      <section>

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

      </section>

    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  function bold(stringToBold) {
    return `<strong v-html> ${stringToBold} </strong>`;
  }
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
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
        removeClassUser: actions.removeClassUser,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .header
    text-align: center

  p
    word-break: keep-all

  section
    text-align: right

</style>
