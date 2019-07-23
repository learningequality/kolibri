<template>

  <div>
    <KTextbox
      ref="password"
      :value="value"
      :autofocus="$attrs.autofocus"
      type="password"
      :disabled="$attrs.disabled"
      :label="$tr('passwordLabel')"
      :invalid="Boolean(pwInvalidText)"
      :invalidText="pwInvalidText"
      :autocomplete="$attrs.autocomplete"
      @blur="pwBlurred = true"
      @input="$emit('update:value', $event)"
    />

    <KTextbox
      ref="confirm"
      v-model="confirmValue"
      type="password"
      :disabled="$attrs.disabled"
      :label="$tr('confirmPasswordLabel')"
      :invalid="Boolean(confirmInvalidText)"
      :invalidText="confirmInvalidText"
      :autocomplete="$attrs.autocomplete"
      @blur="confirmBlurred = true"
    />
  </div>

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';

  export default {
    name: 'PasswordTextbox',
    components: {
      KTextbox,
    },
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
        pwBlurred: false,
        confirmValue: '',
        confirmBlurred: false,
      };
    },
    computed: {
      pwInvalidText() {
        if (this.pwBlurred || this.shouldValidate) {
          if (this.value === '') {
            return this.$tr('errorEmptyString');
          }
        }
        return '';
      },
      confirmInvalidText() {
        if (this.confirmBlurred || this.shouldValidate) {
          if (this.confirmValue === '') {
            return this.$tr('errorEmptyString');
          }
          if (this.confirmValue !== this.value) {
            return this.$tr('errorNotMatching');
          }
        }
        return '';
      },
      isValid() {
        return !(this.pwInvalidText || this.confirmInvalidText);
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
        if (this.pwInvalidText) {
          this.$refs.password.focus();
        } else if (this.confirmInvalidText) {
          this.$refs.confirm.focus();
        }
      },
    },
    $trs: {
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Re-enter password',
      errorEmptyString: 'This field is required',
      errorNotMatching: 'Passwords do not match',
    },
  };

</script>


<style lang="scss" scoped></style>
