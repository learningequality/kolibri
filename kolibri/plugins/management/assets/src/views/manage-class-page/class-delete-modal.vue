<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="false"
    @cancel="close"
  >
    <div>
      {{$tr('deleteConfirmation')}} <strong>{{classname}}</strong>

      <p>{{$tr('description')}}</p>

      <!-- Button Section TODO: cleaunup -->
      <section>

        <icon-button
          :text="$tr('cancel')"
          class="undo-btn"
          @click="close"
        />

        <icon-button
          :text="$tr('delete')"
          class="confirm-btn"
          :primary="true"
          @click="classDelete"
        />

      </section>

    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'classDeleteModal',
    $trs: {
      modalTitle: 'Delete Class',
      delete: 'Delete Class',
      cancel: 'Cancel',
      description: 'Users will only be removed from the class and are still accessible from the "Users" tab.',
      // confirmation messages
      deleteConfirmation: 'Are you sure you want to delete ',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
    },
    props: {
      // delete below
      classname: {
        type: String,
        required: true,
      },
      classid: {
        type: String,
        required: true,
      },
    },
    methods: {
      classDelete() {
        this.deleteClass(this.classid);
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        deleteClass: actions.deleteClass,
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
