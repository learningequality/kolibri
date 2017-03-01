<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="false"
    @cancel="emitCloseSignal"
  >
    <div>
      {{$tr('deleteConfirmation')}} <strong>{{classname}}</strong>

      <p>Users will only be removed from the class and are still accessible from the "Users" tab.</p>

      <!-- Button Section TODO: cleaunup -->
      <section>

        <icon-button
          :text="$tr('cancel')"
          class="undo-btn"
          @click="emitCloseSignal"
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

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'class-delete-modal',
    $trs: {
      modalTitle: 'Delete Class',
      delete: 'Delete Class',
      cancel: 'Cancel',
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
        this.$emit('close');
      },
      emitCloseSignal() {
        this.$emit('close'); // signal parent to close
      },
    },
    vuex: {
      actions: {
        deleteClass: actions.deleteClass,
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
