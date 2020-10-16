<template>

  <KModal
    :title="$tr('createNewClassHeader')"
    size="small"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    :disabled="submitting"
    @submit="createNewClass"
    @cancel="$emit('cancel')"
  >
    <KTextbox
      ref="name"
      v-model.trim="name"
      type="text"
      :label="coreString('classNameLabel')"
      :autofocus="true"
      :disabled="submitting"
      :invalid="nameIsInvalid"
      :invalidText="nameIsInvalidText"
      :maxlength="50"
      @blur="nameBlurred = true"
    />
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ClassCreateModal',
    mixins: [commonCoreStrings],
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
        return !!this.classes.find(
          classroom => classroom.name.toUpperCase() === this.name.toUpperCase()
        );
      },
      nameIsInvalidText() {
        if (!this.formSubmitted) {
          if (this.name === '') {
            return this.coreString('requiredFieldError');
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
      createNewClass() {
        this.submitting = true;
        if (this.formIsValid) {
          this.formSubmitted = true;
          this.$store.dispatch('classManagement/createClass', this.name).then(() => {
            this.$emit('success');
            this.showSnackbarNotification('classCreated');
          });
        } else {
          this.submitting = false;
          this.$refs.name.focus();
        }
      },
    },
    $trs: {
      createNewClassHeader: 'Create new class',
      duplicateName: 'A class with that name already exists',
    },
  };

</script>


<style lang="scss" scoped></style>
