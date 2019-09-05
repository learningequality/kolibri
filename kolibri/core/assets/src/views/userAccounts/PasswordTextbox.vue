<template>

  <div>
    <KTextbox
      ref="password"
      :value="value"
      type="password"
      :label="coreString('passwordLabel')"
      :invalid="Boolean(shownPasswordInvalidText)"
      :invalidText="shownPasswordInvalidText"
      v-bind="$attrs"
      @blur="passwordBlurred = true"
      @input="$emit('update:value', $event)"
    />

    <KTextbox
      ref="confirm"
      v-model="confirmation"
      type="password"
      :disabled="$attrs.disabled"
      :label="$tr('confirmPasswordLabel')"
      :invalid="Boolean(shownConfirmationInvalidText)"
      :invalidText="shownConfirmationInvalidText"
      :autocomplete="$attrs.autocomplete"
      @blur="confirmationBlurred = true"
    />
  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'PasswordTextbox',
    mixins: [commonCoreStrings],
    props: {
      // NOTE: 'value', and 'isValid' must be .sync'd with parent
      value: {
        type: String,
      },
      shouldValidate: {
        type: Boolean,
      },
    },
    data() {
      return {
        passwordBlurred: false,
        confirmation: '',
        confirmationBlurred: false,
      };
    },
    computed: {
      passwordInvalidText() {
        if (this.value === '') {
          return this.coreString('requiredFieldError');
        }
        return '';
      },
      confirmationInvalidText() {
        if (this.confirmation === '') {
          return this.coreString('requiredFieldError');
        }
        if (this.value !== this.confirmation) {
          return this.$tr('errorNotMatching');
        }
        return '';
      },
      shownPasswordInvalidText() {
        if (this.passwordBlurred || this.shouldValidate) {
          return this.passwordInvalidText;
        }
        return '';
      },
      shownConfirmationInvalidText() {
        if (this.confirmationBlurred || this.shouldValidate) {
          return this.confirmationInvalidText;
        }
        return '';
      },
      valid() {
        return this.confirmationInvalidText === '' && this.passwordInvalidText === '';
      },
    },
    watch: {
      valid: {
        handler(value) {
          this.$emit('update:isValid', value);
        },
        immediate: true,
      },
    },
    methods: {
      // @public
      focus() {
        if (this.shownPasswordInvalidText) {
          this.$refs.password.focus();
        } else if (this.shownConfirmationInvalidText) {
          this.$refs.confirm.focus();
        }
      },
    },
    $trs: {
      confirmPasswordLabel: 'Re-enter password',
      errorNotMatching: 'Passwords do not match',
    },
  };

</script>


<style lang="scss" scoped></style>
