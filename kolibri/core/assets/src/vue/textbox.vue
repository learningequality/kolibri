<template>

  <ui-textbox
    @focus="$emit('focus')"
    @input="updateText()"
    v-model="currentText"
    :disabled="disabled"
    :placeholder="placeholder"
    :label="label"
    :aria-label="ariaLabel"
    :autocomplete="autocomplete"
    :autofocus="autofocus"
    :required="required"
    :type="type"
    :invalid="invalid">
  </ui-textbox>

</template>


<script>

  module.exports = {
    name: 'KolibriTextBox',
    props: {
      disabled: {
        type: Boolean,
      },
      autofocus: {
        type: Boolean,
      },
      required: {
        type: Boolean,
      },
      invalid: {
        type: Boolean,
      },
      value: {
        type: String,
      },
      placeholder: {
        type: String,
      },
      label: {
        type: String,
      },
      ariaLabel: {
        type: String,
        // enforcing accessibility
        required: !!this.label,
      },
      autocomplete: {
        type: String,
      },
      type: {
        type: String,
      },
    },
    data() {
      return {
        currentText: this.value,
      };
    },
    methods: {
      updateText(text) {
        // v-model is just a :value + @input
        this.$emit('input', this.currentText);
      },
    },
    components: {
      'ui-textbox': require('keen-ui/src/UiTextbox'),
    },
  };

</script>


<style lang="stylus"></style>
