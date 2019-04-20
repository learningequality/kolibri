<template>

  <KModal
    :title="$tr('createNewClassHeader')"
    size="small"
    :submitText="$tr('saveClassButtonLabel')"
    :cancelText="$tr('cancel')"
    :submitDisabled="submitting"
    @cancel="close"
    @submit="createNewClass"
  >
    <KTextbox
      ref="name"
      v-model.trim="name"
      type="text"
      :label="$tr('classname')"
      :autofocus="true"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      :maxlength="50"
      @blur="nameBlurred = true"
    />
  </KModal>

</template>


<script>

  import { mapActions } from 'vuex';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';

  export default {
    name: 'ClassCreateModal',
    components: {
      KModal,
      KTextbox,
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
      ...mapActions('classManagement', ['createClass', 'displayModal']),
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
    $trs: {
      createNewClassHeader: 'Create new class',
      classname: 'Class name',
      cancel: 'Cancel',
      saveClassButtonLabel: 'Save',
      duplicateName: 'A class with that name already exists',
      required: 'This field is required',
    },
  };

</script>


<style lang="scss" scoped></style>
