<template>

  <core-modal
    :title="$tr('modalTitle')"
    @cancel="close"
  >
    <div>
      <form @submit.prevent="updateName">
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
            class="update-btn"
            type="submit"
            :text="$tr('update')"
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
    $trNameSpace: 'classnameEditModal',
    $trs: {
      modalTitle: 'Change Class Name',
      classname: 'Class Name',
      cancel: 'Cancel',
      update: 'Update',
      alreadyExists: 'A class with that name already exists',
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
      classes: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        name: this.classname,
        errorMessage: '',
      };
    },
    computed: {
      duplicateName() {
        if (this.name === this.classname) {
          return false;
        }
        const index = this.classes.findIndex(
          classroom => classroom.name.toUpperCase() === this.name.toUpperCase());
        if (index === -1) {
          return false;
        }
        return true;
      },
    },
    methods: {
      updateName() {
        if (this.duplicateName) {
          this.errorMessage = this.$tr('alreadyExists');
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

  .footer
    text-align: center

  .update-btn, .undo-btn
    width: 48%

  .error
    color: $core-text-error

</style>
