<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :disabled="$attrs.disabled"
    :label="$tr('label')"
    :label="coreString('fullNameLabel')"
    :autofocus="$attrs.autofocus"
    :maxlength="120"
    :invalid="Boolean(invalidText)"
    :invalidText="invalidText"
    :autocomplete="$attrs.autocomplete"
    @blur="blurred = true"
    @input="$emit('update:value', $event)"
  />

</template>


<script>

  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'FullNameTextbox',
    components: {
      KTextbox,
    },
    mixins: [commonCoreStrings],
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
        if (this.blurred || this.shouldValidate) {
          if (this.value === '') {
            return this.coreString('requiredFieldError');
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
    },
  };

</script>


<style lang="scss" scoped></style>
