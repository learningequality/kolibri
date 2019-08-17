<template>

  <KModal
    :title="$tr('createNewClassHeader')"
    size="small"
    :submitText="coreString('saveAction')"
    :cancelText="coreString('cancelAction')"
    :submitDisabled="submitting"
    @submit="createNewClass"
    @cancel="$emit('cancel')"
  >
    <KTextbox
      ref="name"
      v-model.trim="name"
      type="text"
      :label="coreString('classNameLabel')"
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
      ...mapActions('classManagement', ['createClass']),
      createNewClass() {
        this.formSubmitted = true;
        if (this.formIsValid) {
          this.submitting = true;
          this.createClass(this.name);
        } else {
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
