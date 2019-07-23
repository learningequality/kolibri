<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :disabled="$attrs.disabled"
    :label="$tr('label')"
    :autofocus="$attrs.autofocus"
    :maxlength="30"
    :invalid="Boolean(invalidText)"
    :invalidText="invalidText"
    @blur="blurred = true"
    @input="handleInput"
  />

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import { validateUsername } from 'kolibri.utils.validators';
  import { ERROR_CONSTANTS } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'UsernameTextbox',
    components: {
      KTextbox,
    },
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
        if (this.blurred || this.shouldValidate) {
          if (this.errors.includes(ERROR_CONSTANTS.USERNAME_ALREADY_EXISTS)) {
            return this.$tr('errorNotUnique');
          }
          if (this.isUniqueValidator && !this.isUniqueValidator(this.value)) {
            return this.$tr('errorNotUnique');
          }
          if (this.value === '') {
            return this.$tr('errorEmptyString');
          }
          if (this.errors.includes(ERROR_CONSTANTS.INVALID)) {
            return this.$tr('errorInvalidString');
          }
          if (!validateUsername(this.value)) {
            return this.$tr('errorInvalidString');
          }
        }
        return '';
      },
      isValid() {
        return this.invalidText === '';
      },
    },
    watch: {
      isValid(value) {
        this.$emit('update:isValid', value);
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
