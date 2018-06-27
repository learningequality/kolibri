<template>

  <k-modal
    :title="$tr('addNewClassTitle')"
    size="small"
    :submitText="$tr('create')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @cancel="close"
    @submit="createNewClass"
  >
    <k-textbox
      ref="name"
      type="text"
      :label="$tr('classname')"
      :autofocus="true"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      @blur="nameBlurred = true"
      v-model.trim="name"
    />
  </k-modal>

</template>


<script>

  import { mapActions } from 'vuex';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';

  export default {
    name: 'classCreateModal',
    $trs: {
      addNewClassTitle: 'Add new class',
      classname: 'Class name',
      cancel: 'Cancel',
      create: 'Create',
      duplicateName: 'A class with that name already exists',
      required: 'This field is required',
    },
    components: {
      kModal,
      kTextbox,
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
        nameBlurred: false,
        formSubmitted: false,
        submitting: false,
      };
    },
    computed: {
      duplicateName() {
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
      ...mapActions(['createClass', 'displayModal']),
      createNewClass() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.createClass(this.name);
        } else {
          this.$refs.name.focus();
        }
      },
      close() {
        this.displayModal(false);
      },
    },
  };

</script>


<style lang="stylus" scoped></style>
