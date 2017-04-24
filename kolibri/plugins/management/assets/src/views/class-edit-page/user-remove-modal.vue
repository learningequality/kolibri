<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="false"
    @cancel="close"
  >
    <div>
      {{$trHtml('deleteConfirmation', {username, classname})}}

      <p>{{$tr('still')}} <strong>{{$tr('users')}}</strong>.</p>

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

  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'userRemoveModal',
    $trs: {
      modalTitle: 'Remove User from Class',
      remove: 'Remove from Class',
      cancel: 'Cancel',
      // confirmation messages
      deleteConfirmation: 'Are you sure you want to remove <strong> {{ username }} </strong> from <strong> {{ classname}} </strong>',
      still: 'You can still access this account from ',
      users: 'Users',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
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
