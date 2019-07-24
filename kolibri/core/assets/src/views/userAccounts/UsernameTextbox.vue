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
    @blur="blurred = true"
    @input="handleInput"
  />

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { validateUsername } from 'kolibri.utils.validators';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'UsernameTextbox',
    components: {
      KTextbox,
    },
    mixins: [commonCoreStrings],
    props: {
      // NOTE: 'value', 'errors', and 'isValid' must be .sync'ed with parent
      value: {
        type: String,
      },
      shouldValidate: {
        type: Boolean,
      },
      isUniqueValidator: {
        type: Function,
        required: false,
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
        if (this.isUniqueValidator && !this.isUniqueValidator(this.value)) {
          return this.$tr('errorNotUnique');
        }
        if (this.value === '') {
          return this.coreString('requiredFieldError');
        }
        if (this.errors.includes(ERROR_CONSTANTS.INVALID)) {
          return this.$tr('errorInvalidString');
        }
        if (!validateUsername(this.value)) {
          return this.$tr('errorInvalidString');
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
      // @public
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
      label: 'Username',
      errorEmptyString: 'This field is required',
      errorInvalidString: 'Username can only contain letters, numbers, and underscores',
      errorNotUnique: 'Username already exists',
    },
  };

</script>


<style lang="scss" scoped></style>
