<template>

  <KTextbox
    ref="textbox"
    :value="value"
    :label="'Theme Name'"
    :autofocus="false"
    :maxlength="50"
    :invalid="Boolean(shownInvalidText)"
    :invalidText="shownInvalidText"
    @blur="blurred = true"
    @input="handleInput"
  />
    
</template>

<!-- TODO: Clarify the autofocus attribute should be true or false -->

<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'ThemeNameTextBox',
    mixins: [commonCoreStrings],
    props: {
      themeName: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        blurred: false,
        value: this.themeName,
      };
    },
    computed: {
      isThemeNameEmpty() {
        return this.value && this.value.trim() !== '';
      },
      isThemeNameExists() {
        if (this.value === this.themeName){
          return false;
        }
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
        if (this.blurred) {
          return this.invalidText;
        }
        return '';
      },
    },
    methods: {
      // @public
      focus() {
        return this.$refs.textbox.focus();
      },
      handleInput() {
        if (!this.isThemeNameEmpty && !this.isThemeNameExists) {
          this.$emit('updateThemeName', this.value);
        }
      },
    },
  };

</script>


<style lang="scss" scoped></style>
