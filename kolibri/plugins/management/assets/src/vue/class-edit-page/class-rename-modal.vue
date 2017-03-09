<template>

  <core-modal
    :title="$tr('modalTitle')"
    :has-error="errorMessage ? true : false"
    @enter="updateName"
    @cancel="close"
  >
    <div>
      <!-- Fields for the user to fill out -->
      <section class="class-fields">
        <div class="class-field">
          <core-textbox
            :label="$tr('classname')"
            :aria-label="$tr('classname')"
            :placeholder="classname"
            v-model="name"
            autocomplete="name"
            autofocus
            required
            id="name"
            type="text" />
        </div>
      </section>

      <!-- Button Options at footer of modal -->
      <section class="footer">
        <p class="error" v-if="errorMessage" aria-live="polite">{{errorMessage}}</p>

        <icon-button
          :text="$tr('cancel')"
          class="undo-btn"
          @click="close"
        />

        <icon-button
          class="update-btn"
          :text="$tr('update')"
          @click="updateName"
          :primary="true"
        />
      </section>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'classnameEditModal',
    $trs: {
      // Modal title
      modalTitle: 'Change Class Name',
      // Labels
      classname: 'Class Name',
      // Button Labels
      cancel: 'Cancel',
      update: 'Update',
      // error message
      unknownError: 'Whoops! Something went wrong!',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
    },
    props: {
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
        name: '',
        errorMessage: '',
      };
    },
    mounted() {
      // clear form on load
      Object.assign(this.$data, this.$options.data());
    },
    methods: {
      updateName() {
        if (!this.name) {
          this.errorMessage = 'New class name cannot be empty!';
        } else {
          this.updateClass(this.classid, { name: this.name });
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        updateClass: actions.updateClass,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .class-field
    padding-bottom: 5%
    input
      width: 100%
      height: 40px
      font-weight: bold
    label
      position: relative
      cursor: pointer
    select
      width: 100%
      height: 40px
      font-weight: bold
      background-color: transparent

  .add-form
    width: 300px
    margin: 0 auto
    display: block
    padding: 5px 10px
    letter-spacing: 0.08em
    border: none
    border-bottom: 1px solid $core-text-default
    height: 30px
    &:focus
      outline: none
      border-bottom: 3px solid $core-action-normal

  .footer
    text-align: center

  .update-btn, .undo-btn
    width: 48%

  .error
    color: $core-text-error

</style>
