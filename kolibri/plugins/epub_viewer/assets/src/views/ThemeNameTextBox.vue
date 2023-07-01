<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :label="'Theme Name'"
    :autofocus="$attrs.autofocus"
    :maxlength="50"
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
    name: 'ThemeNameTextBox',
    mixins: [commonCoreStrings],
    props: {
      value: {
        type: String,
        default: '',
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
      isThemeNameEmpty() {
        return !this.value && this.value.trim() === '';
      },
      isThemeNameExists() {
        // if (this.value === this.themeName){
        //   return false;
        // }
        // TODO: look for local storage keys and check if the theme name exists
        // SAMPLE CODE:
        // if (localStorage.getItem(this.value) !== null){
        //   return true;
        // }
        return false; // to be implemented
      },
      invalidText() {
        if (this.isThemeNameEmpty) {
          return this.coreString('requiredFieldError');
        }
        if (this.isThemeNameExists) {
          return this.coreString('themeNameExistsError'); // to be implemented
        }
        return '';
      },
      shownInvalidText() {
        if (this.blurred || this.shouldValidate) {
          return this.invalidText;
        }
        return '';
      },
    },
    watch: {
      isThemeNameEmpty: {
        handler(value) {
          this.$emit('update:isValid', !value);
        },
        immediate: true,
      },
      isThemeNameExists: {
        handler(value) {
          this.$emit('update:isValid', !value);
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
