<template>

  <core-modal
    :title="$tr('modalTitle')"
    @cancel="close"
  >
    <div>
      <form @submit.prevent="updateName">
        <k-textbox
          type="text"
          :label="$tr('classname')"
          :autofocus="true"
          :invalid="nameIsInvalid"
          :invalidText="nameIsInvalidText"
          v-model.trim="name"
          @blur="validateName = true"
        />

        <section class="footer">
          <k-button
            type="button"
            :raised="false"
            :text="$tr('cancel')"
            @click="close"
          />

          <k-button
            type="submit"
            :text="$tr('update')"
            :primary="true"
            :disabled="!formIsValid"
          />
        </section>
      </form>
    </div>
  </core-modal>

</template>


<script>

  import * as actions from '../../state/actions';
  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  export default {
    name: 'classnameEditModal',
    $trs: {
      modalTitle: 'Change Class Name',
      classname: 'Class Name',
      cancel: 'Cancel',
      update: 'Update',
      duplicateName: 'A class with that name already exists',
      required: 'This field is required',
    },
    components: {
      kButton,
      coreModal,
      kTextbox,
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
        validateName: false,
        validateForm: false,
      };
    },
    computed: {
      duplicateName() {
        if (this.name === this.classname) {
          return false;
        }
        const index = this.classes.findIndex(
          classroom => classroom.name.toUpperCase() === this.name.toUpperCase()
        );
        if (index === -1) {
          return false;
        }
        return true;
      },
      nameIsInvalidText() {
        if (this.validateName || this.validateForm) {
          if (this.name === '') {
            return this.$tr('required');
          }
          if (this.duplicateName) {
            return this.$tr('duplicateName');
          }
        }
        return '';
      },
      nameIsInvalid() {
        return !!this.nameIsInvalidText;
      },
      formIsValid() {
        return !this.nameIsInvalid;
      },
    },
    methods: {
      updateName() {
        this.validateForm = true;
        if (!this.nameIsInvalid) {
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

  .footer
    text-align: center

</style>
