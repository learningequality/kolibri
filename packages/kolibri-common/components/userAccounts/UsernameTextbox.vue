<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :disabled="$attrs.disabled"
    :label="coreString('usernameLabel')"
    :autofocus="$attrs.autofocus"
    :maxlength="30"
    :invalid="Boolean(shownInvalidText)"
    :invalidText="shownInvalidText"
    autocomplete="username"
    @blur="blurred = true"
    @input="handleInput"
  />

</template>


<script>

  import { validateUsername } from 'kolibri/utils/validators';
  import { ERROR_CONSTANTS } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  export default {
    name: 'UsernameTextbox',
    mixins: [commonCoreStrings],
    props: {
      // NOTE: 'value', 'errors', and 'isValid' must be .sync'ed with parent
      // You can also pass 'disabled' and 'autofocus'
      value: {
        type: String,
        default: '',
      },
      shouldValidate: {
        type: Boolean,
      },
      isUniqueValidator: {
        type: Function,
        default: null,
      },
      // Pass in errors to make the component reactive to them
      errors: {
        type: Array,
        default() {
          return [];
        },
      },
    },
    data() {
      return {
        blurred: false,
      };
    },
    computed: {
      invalidText() {
        if (this.errors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS)) {
          return this.$tr('errorNotUnique');
        }
        if (this.value === '') {
          return this.coreString('requiredFieldError');
        }
        if (this.isUniqueValidator && !this.isUniqueValidator(this.value)) {
          return this.$tr('errorNotUnique');
        }
        if (this.errors.includes(ERROR_CONSTANTS.INVALID)) {
          return this.coreString('usernameNotAlphaNumError');
        }
        if (!validateUsername(this.value)) {
          return this.coreString('usernameNotAlphaNumError');
        }
        return '';
      },
      shownInvalidText() {
        if (this.blurred || this.shouldValidate) {
          return this.invalidText;
        }
        return '';
      },
      valid() {
        return this.invalidText === '';
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
      /**
       *  @public
       */
      focus() {
        return this.$refs.textbox.focus();
      },
      handleInput($event) {
        if (this.errors.length > 0) {
          this.$emit('update:errors', []);
        }
        this.$emit('update:value', $event);
      },
    },
    $trs: {
      errorNotUnique: {
        message: 'Username already exists',
        context:
          'Error message displayed to user if they chose a username that another user has already taken.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
