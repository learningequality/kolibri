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
          :invalid="duplicateName"
          :error="$tr('duplicateName')"
          type="text"
        />

        <section class="footer">
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
          />
        </section>
      </form>
    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import iconButton from 'kolibri.coreVue.components.iconButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import coreTextbox from 'kolibri.coreVue.components.textbox';
  export default {
    $trNameSpace: 'classnameEditModal',
    $trs: {
      modalTitle: 'Change Class Name',
      classname: 'Class Name',
      cancel: 'Cancel',
      update: 'Update',
      duplicateName: 'A class with that name already exists'
    },
    components: {
      iconButton,
      coreModal,
      coreTextbox
    },
    props: {
      classname: {
        type: String,
        required: true
      },
      classid: {
        type: String,
        required: true
      },
      classes: {
        type: Array,
        required: true
      }
    },
    data() {
      return { name: this.classname };
    },
    computed: {
      duplicateName() {
        if (this.name === this.classname) {
          return false;
        }
        const index = this.classes.findIndex(classroom => classroom.name.toUpperCase() === this.name.toUpperCase());
        if (index === -1) {
          return false;
        }
        return true;
      }
    },
    methods: {
      updateName() {
        if (!this.duplicateName) {
          this.updateClass(this.classid, { name: this.name });
        }
      },
      close() {
        this.displayModal(false);
      }
    },
    vuex: {
      actions: {
        updateClass: actions.updateClass,
        displayModal: actions.displayModal
      }
    }
  };

</script>


<style lang="stylus" scoped>

  .footer
    text-align: center

  .update-btn, .undo-btn
    width: 48%

</style>
