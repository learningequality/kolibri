<template>

  <core-modal
    :title="$tr('addNewClassTitle')"
    :has-error="errorMessage ? true : false"
    @enter="createNewClass"
    @cancel="close"
  >
    <div>
      <!-- Fields for the user to fill out -->
      <section class="class-fields">
        <div class="class-field">
          <core-textbox
            :label="$tr('classname')"
            :aria-label="$tr('classname')"
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
        <icon-button
          :text="$tr('cancel')"
          class="undo-btn"
          @click="close"
        />

        <icon-button
          class="create-btn"
          :text="$tr('create')"
          @click="createNewClass"
          :primary="true"
        />
      </section>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../actions');

  module.exports = {
    $trNameSpace: 'classCreateModal',
    $trs: {
      // Modal title
      addNewClassTitle: 'Add New Class',
      // Labels
      classname: 'Class Name',
      // Button Labels
      cancel: 'Cancel',
      create: 'Create',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
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
      createNewClass() {
        const newClass = {
          name: this.name,
          facilityId: this.facility,
        };
        this.createClass(newClass).then(
          () => {
            this.close();
          },
          (error) => {
            // need to display the error message
          }
        );
      },
      close() {
        this.$emit('close'); // signal parent to close
      },
    },
    vuex: {
      getters: {
        facility: state => state.facility,
      },
      actions: {
        createClass: actions.createClass,
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

  .create-btn, .undo-btn
    width: 48%

</style>
