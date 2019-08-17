<template>

  <!--
   This component was forked from the Keen library in order to handle
   dynamic styling of the drop down text color.

   The formatting has been changed to match our linters. We may eventually
   want to simply consolidate it with our component and remove any unused
   functionality.
  -->

  <div class="ui-textbox" :class="classes">
    <div v-if="icon || $slots.icon" class="ui-textbox-icon-wrapper">
      <slot name="icon">
        <UiIcon :icon="icon" :style="isActive ? { color: $themeTokens.primary } : {}" />
      </slot>
    </div>

    <div class="ui-textbox-content">
      <label class="ui-textbox-label">
        <div
          v-if="label || $slots.default"
          class="ui-textbox-label-text"
          :class="labelClasses"
          :style="isActive ? { color: $themeTokens.primary } : {}"
        >
          <slot>{{ label }}</slot>
        </div>

        <input
          v-if="!multiLine"
          ref="input"

          v-autofocus="autofocus"
          class="ui-textbox-input"
          :autocomplete="autocomplete ? autocomplete : null"
          :disabled="disabled"
          :max="maxValue"
          :maxlength="enforceMaxlength ? maxlength : null"
          :min="minValue"
          :name="name"
          :number="type === 'number' ? true : null"
          :placeholder="hasFloatingLabel ? null : placeholder"
          :readonly="readonly"
          :required="required"
          :step="stepValue"
          :style="isActive ? { borderBottomColor: $themeTokens.primary } : {}"

          :type="type"
          :value="value"
          @blur="onBlur"
          @change="onChange"
          @focus="onFocus"
          @input="updateValue($event.target.value)"

          @keydown.enter="onKeydownEnter"
          @keydown="onKeydown"
        >

        <textarea
          v-else
          ref="textarea"

          v-autofocus="autofocus"
          :value="value"
          class="ui-textbox-textarea"
          :autocomplete="autocomplete ? autocomplete : null"
          :disabled="disabled"
          :maxlength="enforceMaxlength ? maxlength : null"
          :name="name"
          :placeholder="hasFloatingLabel ? null : placeholder"

          :readonly="readonly"

          :required="required"
          :rows="rows"
          :style="isActive ? { borderBottomColor: $themeTokens.primary } : {}"
          @blur="onBlur"
          @change="onChange"
          @focus="onFocus"
          @input="updateValue($event.target.value)"

          @keydown.enter="onKeydownEnter"
          @keydown="onKeydown"
        ></textarea>
      </label>

      <div v-if="hasFeedback || maxlength" class="ui-textbox-feedback">
        <div v-if="showError" class="ui-textbox-feedback-text">
          <slot name="error">
            {{ error }}
          </slot>
        </div>

        <div v-else-if="showHelp" class="ui-textbox-feedback-text">
          <slot name="help">
            {{ help }}
          </slot>
        </div>

        <div v-if="maxlength" class="ui-textbox-counter">
          {{ $tr('maxLengthCounter', { current: valueLength, max: maxlength }) }}
        </div>
      </div>
    </div>
  </div>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon.vue';

  import autosize from 'autosize';
  import autofocus from 'keen-ui/src/directives/autofocus';

  export default {
    name: 'KeenUiTextbox',
    components: {
      UiIcon,
    },

    directives: {
      autofocus,
    },

    props: {
      name: String,
      placeholder: String,
      value: {
        type: [String, Number],
        default: '',
      },
      icon: String,
      iconPosition: {
        type: String,
        default: 'left', // 'left' or 'right'
      },
      label: String,
      floatingLabel: {
        type: Boolean,
        default: false,
      },
      type: {
        type: String,
        default: 'text', // all the possible HTML5 input types, except those that have a special UI
      },
      multiLine: {
        type: Boolean,
        default: false,
      },
      rows: {
        type: Number,
        default: 2,
      },
      autocomplete: String,
      autofocus: {
        type: Boolean,
        default: false,
      },
      autosize: {
        type: Boolean,
        default: true,
      },
      min: Number,
      max: Number,
      step: {
        type: String,
        default: 'any',
      },
      maxlength: Number,
      enforceMaxlength: {
        type: Boolean,
        default: false,
      },
      required: {
        type: Boolean,
        default: false,
      },
      readonly: {
        type: Boolean,
        default: false,
      },
      help: String,
      error: String,
      invalid: {
        type: Boolean,
        default: false,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },

    data() {
      return {
        isActive: false,
        isTouched: false,
        initialValue: this.value,
        autosizeInitialized: false,
      };
    },

    computed: {
      classes() {
        return [
          `ui-textbox--icon-position-${this.iconPosition}`,
          { 'is-active': this.isActive },
          { 'is-invalid': this.invalid },
          { 'is-touched': this.isTouched },
          { 'is-multi-line': this.multiLine },
          { 'has-counter': this.maxlength },
          { 'is-disabled': this.disabled },
          { 'has-label': this.hasLabel },
          { 'has-floating-label': this.hasFloatingLabel },
        ];
      },

      labelClasses() {
        return {
          'is-inline': this.hasFloatingLabel && this.isLabelInline,
          'is-floating': this.hasFloatingLabel && !this.isLabelInline,
        };
      },

      hasLabel() {
        return Boolean(this.label) || Boolean(this.$slots.default);
      },

      hasFloatingLabel() {
        return this.hasLabel && this.floatingLabel;
      },

      isLabelInline() {
        return this.valueLength === 0 && !this.isActive;
      },

      minValue() {
        if (this.type === 'number' && this.min !== undefined) {
          return this.min;
        }

        return null;
      },

      maxValue() {
        if (this.type === 'number' && this.max !== undefined) {
          return this.max;
        }

        return null;
      },

      stepValue() {
        return this.type === 'number' ? this.step : null;
      },

      valueLength() {
        return this.value ? this.value.length : 0;
      },

      hasFeedback() {
        return Boolean(this.help) || Boolean(this.error) || Boolean(this.$slots.error);
      },

      showError() {
        return this.invalid && (Boolean(this.error) || Boolean(this.$slots.error));
      },

      showHelp() {
        return !this.showError && (Boolean(this.help) || Boolean(this.$slots.help));
      },
    },

    created() {
      // Normalize the value to an empty string if it's null
      if (this.value === null) {
        this.initialValue = '';
        this.updateValue('');
      }
    },

    mounted() {
      if (this.multiLine && this.autosize) {
        autosize(this.$refs.textarea);
        this.autosizeInitialized = true;
      }
    },

    beforeDestroy() {
      if (this.autosizeInitialized) {
        autosize.destroy(this.$refs.textarea);
      }
    },

    methods: {
      updateValue(value) {
        this.$emit('input', value);
      },

      onChange(e) {
        this.$emit('change', this.value, e);
      },

      onFocus(e) {
        this.isActive = true;
        this.$emit('focus', e);
      },

      onBlur(e) {
        this.isActive = false;
        this.$emit('blur', e);

        if (!this.isTouched) {
          this.isTouched = true;
          this.$emit('touch');
        }
      },

      onKeydown(e) {
        this.$emit('keydown', e);
      },

      onKeydownEnter(e) {
        this.$emit('keydown-enter', e);
      },

      /**
       * @public
       */
      reset() {
        // Blur the input if it's focused to prevent required errors
        // when it's value is reset
        if (
          document.activeElement === this.$refs.input ||
          document.activeElement === this.$refs.textarea
        ) {
          document.activeElement.blur();
        }

        this.updateValue(this.initialValue);
        this.resetTouched();
      },

      resetTouched(options = { touched: false }) {
        this.isTouched = options.touched;
      },

      /**
       * @public
       */
      refreshSize() {
        if (this.autosizeInitialized) {
          autosize.update(this.$refs.textarea);
        }
      },
    },

    $trs: {
      maxLengthCounter: '{current, number, integer}/{max, number, integer}',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~keen-ui/src/styles/imports';

  /* stylelint-disable */

  .ui-textbox {
    display: flex;
    align-items: flex-start;
    margin-bottom: $ui-input-margin-bottom;

    &:hover:not(.is-disabled) {
      .ui-textbox-label-text {
        color: $ui-input-label-color--hover;
      }

      .ui-textbox-input,
      .ui-textbox-textarea {
        border-bottom-color: $ui-input-border-color--hover;
      }
    }
    &:focus {
    }

    &.is-active:not(.is-disabled) {
      .ui-textbox-input,
      .ui-textbox-textarea {
        border-bottom-width: $ui-input-border-width--active;
      }
    }

    &.has-label {
      .ui-textbox-icon-wrapper {
        padding-top: $ui-input-icon-margin-top--with-label;
      }
    }

    &.has-counter {
      .ui-textbox-feedback-text {
        padding-right: rem-calc(48px);
      }
    }

    &.has-floating-label {
      .ui-textbox-label-text {
        // Behaves like a block, but width is the width of its content.
        // Needed here so label doesn't overflow parent when scaled.
        display: table;

        &.is-inline {
          color: $ui-input-label-color; // So the hover styles don't override it
          cursor: text;
          transform: translateY($ui-input-label-top--inline) scale(1.1);
        }

        &.is-floating {
          transform: translateY(0) scale(1);
        }
      }
    }

    &.is-invalid:not(.is-disabled) {
      .ui-textbox-label-text,
      .ui-textbox-icon-wrapper .ui-icon,
      .ui-textbox-counter {
        color: $ui-input-label-color--invalid;
      }

      .ui-textbox-input,
      .ui-textbox-textarea {
        border-bottom-color: $ui-input-border-color--invalid;
      }

      .ui-textbox-feedback {
        color: $ui-input-feedback-color--invalid;
      }
    }

    &.is-disabled {
      .ui-textbox-input,
      .ui-textbox-textarea {
        color: $ui-input-text-color--disabled;
        border-bottom-style: $ui-input-border-style--disabled;
        border-bottom-width: $ui-input-border-width--active;
      }

      .ui-textbox-icon-wrapper .ui-icon {
        opacity: $ui-input-icon-opacity--disabled;
      }

      .ui-textbox-feedback {
        opacity: $ui-input-feedback-opacity--disabled;
      }
    }
  }

  .ui-textbox-label {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0;
  }

  .ui-textbox-icon-wrapper {
    flex-shrink: 0;
    padding-top: $ui-input-icon-margin-top;
    margin-right: rem-calc(12px);

    .ui-icon {
      color: $ui-input-icon-color;
    }
  }

  .ui-textbox-content {
    flex-grow: 1;
  }

  .ui-textbox-label-text {
    margin-bottom: $ui-input-label-margin-bottom;
    font-size: $ui-input-label-font-size;
    line-height: $ui-input-label-line-height;
    color: $ui-input-label-color;
    cursor: default;
    transition: color 0.1s ease, transform 0.2s ease;
    transform-origin: left;
  }

  .ui-textbox-input,
  .ui-textbox-textarea,
  .ui-textbox-input:focus,
  .ui-textbox-textarea:focus {
    display: block;
    width: 100%;
    padding: 0;
    margin: 0;
    font-size: $ui-input-text-font-size;
    font-weight: normal;
    color: $ui-input-text-color;
    cursor: auto;
    background: none;
    border: none;
    border-bottom-color: $ui-input-border-color;
    border-bottom-style: solid;
    border-bottom-width: $ui-input-border-width;
    border-radius: 0;
    outline: none;
    transition: border 0.1s ease;
  }

  .ui-textbox-input {
    height: $ui-input-height;
  }

  .ui-textbox-textarea {
    padding-bottom: rem-calc(6px);
    overflow-x: hidden;
    overflow-y: auto;
    resize: vertical;
  }

  .ui-textbox-feedback {
    position: relative;
    padding-top: $ui-input-feedback-padding-top;
    margin: 0;
    font-size: $ui-input-feedback-font-size;
    line-height: $ui-input-feedback-line-height;
    color: $ui-input-feedback-color;
  }

  .ui-textbox-counter {
    position: absolute;
    top: $ui-input-feedback-padding-top;
    right: 0;
  }

  /* stylelint-enable */

</style>
