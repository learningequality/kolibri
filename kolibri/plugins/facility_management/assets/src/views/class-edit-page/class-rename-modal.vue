<template>

  <core-modal
    :title="$tr('modalTitle')"
    @cancel="close"
  >
    <div>
      <form @submit.prevent="updateName">
        <k-textbox
          ref="name"
          type="text"
          :label="$tr('classname')"
          :autofocus="true"
          :invalid="nameIsInvalid"
          :invalidText="nameIsInvalidText"
          :maxlength="50"
          @blur="nameBlurred = true"
          v-model.trim="name"
        />

        <div class="core-modal-buttons">
          <k-button
            type="button"
            appearance="flat-button"
            :text="$tr('cancel')"
            @click="close"
          />
          <k-button
            type="submit"
            :text="$tr('update')"
            :primary="true"
            :disabled="submitting"
          />
        </div>
      </form>
    </div>
  </core-modal>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { updateClass, displayModal } from '../../state/actions';

  export default {
    name: 'classRenameModal',
    $trs: {
      modalTitle: 'Change class name',
      classname: 'Class name',
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
        nameBlurred: false,
        formSubmitted: false,
        submitting: false,
      };
    },
    computed: {
      duplicateName() {
        // if same name, different case
        if (this.name.toUpperCase() === this.classname.toUpperCase()) {
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
        if (this.nameBlurred || this.formSubmitted) {
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
        return Boolean(this.nameIsInvalidText);
      },
      formIsValid() {
        return !this.nameIsInvalid;
      },
    },
    methods: {
      updateName() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.updateClass(this.classid, { name: this.name });
        } else {
          this.$refs.name.focus();
        }
      },
      close() {
        this.displayModal(false);
      },
    },
    vuex: {
      actions: {
        updateClass,
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
