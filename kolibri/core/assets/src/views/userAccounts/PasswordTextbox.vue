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
      @keydown.enter="checkErrorsAndSubmit"
    />

    <KTextbox
      v-if="showConfirmationInput"
      ref="confirm"
      v-model="confirmation"
      type="password"
      :disabled="$attrs.disabled"
      :label="$tr('confirmPasswordLabel')"
      :invalid="Boolean(shownConfirmationInvalidText)"
      :invalidText="shownConfirmationInvalidText"
      :autocomplete="$attrs.autocomplete"
      @blur="confirmationBlurred = true"
      @keydown.enter="checkErrorsAndSubmit"
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
        default: '',
      },
      shouldValidate: {
        type: Boolean,
      },
      // Set to false if you just want one password field
      showConfirmationInput: {
        type: Boolean,
        default: true,
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
        let passwordValid = this.passwordInvalidText === '';
        if (this.showConfirmationInput) {
          return this.confirmationInvalidText === '' && passwordValid;
        }
        return passwordValid;
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
      // @public
      resetAndFocus() {
        this.passwordBlurred = false;
        this.$emit('update:value', '');
        this.$refs.password.focus();
      },
      checkErrorsAndSubmit(e) {
        if (this.valid) {
          this.$emit('submitNewPassword');
        } else {
          // Blurring will cause validation errors to show if needed
          e.target.blur();
        }
      },
    },
    $trs: {
      confirmPasswordLabel: {
        message: 'Re-enter password',
        context:
          "This text displays on the 'Create an account' form when a new user signs up for Kolibri. A new users needs to confirm their password  in the 'Re-enter password' field to make sure it matches the 'Password' entered in the previous field.",
      },
      errorNotMatching: {
        message: 'Passwords do not match',
        context:
          "This message will display on the 'Create an account' form if the password entered in the 'Password' field does not match the password entered in the 'Re-enter password' field.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
