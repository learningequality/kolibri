<template>

  <UiSelect
    class="k-select"
    :class="{
      'k-select-inline': inline,
      'k-select-disabled': disabled,
    }"
    :value="selection"
    :options="options"
    :label="label"
    :floatingLabel="floatingLabel"
    :disabled="disabled"
    :invalid="invalid"
    :error="invalidText"
    :name="name"
    :clearable="clearable"
    :placeholder="placeholder"
    @change="handleChange"
    @blur="$emit('blur')"
  >
    <template #display>
      <slot name="display"></slot>
    </template>
    <template #option="{ highlighted, index, option, selected }">
      <slot
        name="option"
        :highlighted="highlighted"
        :index="index"
        :option="option"
        :selected="selected"
      >
      </slot>
    </template>
  </UiSelect>

</template>


<script>

  import has from 'lodash/has';
  import isObject from 'lodash/isObject';
  import UiSelect from './KeenUiSelect';

  function areValidOptions(array) {
    return array.every(object => {
      return isValidOption(object);
    });
  }

  function isValidOption(object) {
    if (!isObject(object)) {
      return false;
    } else if (Object.keys(object).length === 0) {
      return true;
    }
    return has(object, 'value') && has(object, 'label');
  }

  /**
   * Used to select or filter items
   */
  export default {
    name: 'KSelect',
    components: {
      UiSelect,
    },
    model: {
      event: 'change',
    },
    props: {
      /**
       * Object currently selected
       */
      value: {
        type: Object,
        required: true,
        validator(val) {
          return isValidOption(val);
        },
      },
      /**
       * Array of option objects { value, label, disabled }.
       * Disabled key is optional
       */
      options: {
        type: Array,
        required: true,
        validator(val) {
          return areValidOptions(val);
        },
      },
      /**
       * Label
       */
      label: {
        type: String,
        default: null,
      },
      /**
       * Whether disabled or not
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Whether invalid or not
       */
      invalid: {
        type: Boolean,
        default: false,
      },
      /**
       * Text displayed if invalid
       */
      invalidText: {
        type: String,
        default: null,
      },
      /**
       * Whether or not display as inline block
       */
      inline: {
        type: Boolean,
        default: false,
      },
      floatingLabel: {
        type: Boolean,
        default: true,
      },
      placeholder: {
        type: String,
        default: null,
      },
      /**
       * Whether to turn into a clearable state
       * when an option has been selected.
       */
      clearable: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        // workaround for Keen-ui not displaying floating labels for empty objects
        selection: Object.keys(this.value).length === 0 ? '' : this.value,
      };
    },
    computed: {
      name() {
        return `k-select-${this._uid}`;
      },
    },
    watch: {
      value(inputValue) {
        this.selection = inputValue;
      },
      selection(newSelection) {
        /* Emits new selection.*/
        if (!this.disabled) {
          this.$emit('change', newSelection);
        }
      },
    },
    methods: {
      handleChange(newSelection) {
        this.selection = newSelection;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/keen/styles/imports';

  .k-select-inline {
    display: inline-block;
    width: 150px;
    margin-right: 16px;
    vertical-align: bottom;
  }

  .k-select-disabled /deep/ .ui-select__label-text.is-inline {
    cursor: default;
  }

  /* stylelint-disable csstree/validator */

  .k-select-disabled {
    border-bottom-color: $ui-input-text-color--disabled;
    border-bottom-style: $ui-input-border-style--disabled;
    border-bottom-width: $ui-input-border-width--active;
  }

  /* stylelint-enable */

  /deep/ .ui-select__display-value {
    line-height: 1.3;
  }

</style>
