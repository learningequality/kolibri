<template>

  <core-modal
    :title="$tr('addNewClassTitle')"
    @cancel="close"
  >
    <div>
      <form @submit.prevent="createNewClass">
        <core-textbox
          :label="$tr('classname')"
          :aria-label="$tr('classname')"
          v-model.trim="name"
          :autofocus="true"
          :required="true"
          type="text"
        />

        <section class="footer">
          <p class="error" v-if="errorMessage" aria-live="polite">{{errorMessage}}</p>

          <icon-button
            class="undo-btn"
            type="button"
            :text="$tr('cancel')"
            @click="close"
          />

          <icon-button
            class="create-btn"
            type="submit"
            :text="$tr('create')"
            :primary="true"
            :disabled="name === ''"
          />
        </section>
      </form>
    </div>
  </core-modal>

</template>


<script>

  const actions = require('../../state/actions');

  module.exports = {
    $trNameSpace: 'classCreateModal',
    $trs: {
      addNewClassTitle: 'Add New Class',
      classname: 'Class Name',
      cancel: 'Cancel',
      create: 'Create',
      alreadyExists: 'A class with that name already exists',
    },
    components: {
      'icon-button': require('kolibri.coreVue.components.iconButton'),
      'core-modal': require('kolibri.coreVue.components.coreModal'),
      'core-textbox': require('kolibri.coreVue.components.textbox'),
    },
    props: {
      classes: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        name: '',
        errorMessage: '',
      };
    },
    computed: {
      duplicateName() {
        const index = this.classes.findIndex(
          classroom => classroom.name.toUpperCase() === this.name.toUpperCase());
        if (index === -1) {
          return false;
        }
        return true;
      },
    },
    methods: {
      createNewClass() {
        if (this.duplicateName) {
          this.errorMessage = this.$tr('alreadyExists');
        } else {
          this.createClass(this.name);
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        createClass: actions.createClass,
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .footer
    text-align: center

  .create-btn, .undo-btn
    width: 48%

  .error
    color: $core-text-error

</style>
