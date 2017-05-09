<template>

  <ui-textbox
    @focus="$emit('focus')"
    @blur="$emit('blur')"
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
    :error="error"
    :invalid="invalid"
    :maxlength="maxlength"
    :enforceMaxlength="enforceMaxlength"
    ref="textbox"
  />

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
        type: [String, Number],
      },
      error: {
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
      maxlength: {
        type: Number,
      },
      enforceMaxlength: {
        type: Boolean,
        default: true,
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
      reset() {
        this.$refs.textbox.reset();
      },
    },
    components: {
      'ui-textbox': require('keen-ui/src/UiTextbox'),
    },
  };

</script>


<style lang="stylus"></style>
