<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="error_message ? true : false"
    :enableBackBtn="usr_delete || pw_reset"
    @cancel="emitCloseSignal"
  >
    <div>
      <div class="user-field">
        {{$trHtml('deleteConfirmation', {name:classname})}}
      </div>
      <p>Users will only be removed from the class and are still accessible from the "Users" tab.</p>

      <!-- Error Messages -->
      <p class="error" v-if="error_message" aria-live="polite"> {{error_message}} </p>

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
          @click="submit"
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
      // this one is going to get a little complicated
      deleteConfirmation: 'Are you sure you want to delete {name}?',
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
    data() {
      return {
        error_message: '',
      };
    },
    methods: {
      submit() {
        // need delete logic here.
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

  .user-field
    padding-bottom: 5%
    input
      width: 100%
      height: 40px
      font-weight: bold
      border: none
      border-bottom: 1px solid #3a3a3a
    label
      position: relative
    select
      -webkit-appearance: menulist-button
      width: 100%
      height: 40px
      font-weight: bold
      background-color: transparent
    p
      text-align: center

  .header
    text-align: center

  p
    word-break: keep-all

  .error
    color: red

</style>
