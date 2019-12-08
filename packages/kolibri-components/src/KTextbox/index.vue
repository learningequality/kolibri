<template>

  <div class="mh">
    <KeenUiTextbox
      ref="textbox"
      v-model="currentText"
      class="textbox"
      :label="label"
      :disabled="disabled"
      :invalid="showInvalidMessage"
      :error="invalidText"
      :autofocus="autofocus"
      :maxlength="maxlength"
      :autocomplete="autocomplete"
      :type="type"
      :min="min"
      :max="max"
      :enforceMaxlength="true"
      :floatingLabel="floatingLabel"
      :multiLine="textArea"
      :rows="3"
      @input="updateText"
      @keydown="emitKeydown"
      @focus="$emit('focus')"
      @blur="$emit('blur')"
    />
  </div>

</template>


<script>

  import KeenUiTextbox from './KeenUiTextbox';

  /**
   * Handles user input.
   */
  export default {
    name: 'KTextbox',
    components: { KeenUiTextbox },
    inheritAttrs: true,
    props: {
      /**
       * v-model
       */
      value: {
        type: [String, Number],
      },
      /**
       * Label
       */
      label: {
        type: String,
        required: true,
      },
      /**
       * Whether or not disabled
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Whether or not input is invalid
       */
      invalid: {
        type: Boolean,
        default: false,
      },
      /**
       * Text displayed if input is invalid
       */
      invalidText: {
        type: String,
        required: false,
      },
      /**
       * Whether or not to autofocus
       */
      autofocus: {
        type: Boolean,
        default: false,
      },
      /**
       * Max allowed length of input
       */
      maxlength: {
        type: Number,
        required: false,
      },
      /**
       * HTML5 autocomplete attribute (off, on, name, username, current-password, etc.)
       */
      autocomplete: {
        type: String,
        required: false,
      },
      /**
       * HTML5 type of input (text, password, number, etc.)
       */
      type: {
        type: String,
        default: 'text',
      },
      /**
       * Minimum value, used when type is 'number'
       */
      min: {
        type: Number,
        required: false,
      },
      /**
       * Maximum value, used when type is 'number'
       */
      max: {
        type: Number,
        required: false,
      },
      /**
       * Display as text area.
       */
      textArea: {
        type: Boolean,
        default: false,
      },
      /**
       * @private
       * Whether or not to display as a floating label
       */
      floatingLabel: {
        type: Boolean,
        default: true,
      },
    },
    data() {
      return {
        currentText: this.value,
        changedOrFocused: false,
      };
    },
    computed: {
      showInvalidMessage() {
        return this.invalid && this.changedOrFocused;
      },
    },
    watch: {
      value(val) {
        this.currentText = val;
        this.changedOrFocused = true;
      },
    },
    methods: {
      updateText() {
        // v-model is just a :value + @input
        /**
         * Emits input event with new value
         */
        this.$emit('input', this.currentText);
      },
      /**
       * @public
       */
      reset() {
        this.$refs.textbox.reset();
      },
      emitKeydown(e) {
        /**
         * Emits keydown event
         */
        this.$emit('keydown', e);
      },
      /**
       * @public
       * Focuses on the textbox
       */
      focus() {
        this.changedOrFocused = true;
        this.$refs.textbox.$el.querySelector('input').focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  .textbox {
    max-width: 400px;
  }

  .mh {
    min-height: 72px;
  }

</style>
