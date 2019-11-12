<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :disabled="$attrs.disabled"
    :label="coreString('fullNameLabel')"
    :autofocus="$attrs.autofocus"
    :maxlength="120"
    :invalid="Boolean(shownInvalidText)"
    :invalidText="shownInvalidText"
    :autocomplete="$attrs.autocomplete"
    @blur="blurred = true"
    @input="$emit('update:value', $event)"
  />

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'FullNameTextbox',
    mixins: [commonCoreStrings],
    // NOTE: 'value' and 'isValid' must be .sync'd with parent
    props: {
      value: {
        type: String,
      },
      shouldValidate: {
        type: Boolean,
      },
    },
    data() {
      return {
        blurred: false,
      };
    },
    computed: {
      invalidText() {
        if (this.value === '') {
          return this.coreString('requiredFieldError');
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
    },
  };

</script>


<style lang="scss" scoped></style>
