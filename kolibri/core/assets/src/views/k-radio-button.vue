<template>

  <!-- HTML makes clicking label apply to input by default -->
  <label :class="['k-radio-button', {disabled}]">
    <!-- v-model listens for @input event by default -->
    <!-- @input has compatibility issues for input of type radio -->
    <!-- Here, manually listen for @change (no compatibility issues) -->
    <input
      ref="input"
      type="radio"
      class="input"
      :id="id"
      :checked="isChecked"
      :value="value"
      :disabled="disabled"
      :autofocus="autofocus"
      @focus="active = true"
      @blur="active = false"
      @change="update($event)"
    >
    <!-- the radio buttons the user sees -->
    <mat-svg
      v-if="isChecked"
      category="toggle"
      name="radio_button_checked"
      :class="['checked', {disabled, active}]"
    />
    <mat-svg
      v-else
      category="toggle"
      name="radio_button_unchecked"
      :class="['unchecked', {disabled, active}]"
    />

    <span class="text" dir="auto">
      {{ label }}
      <span
        v-if="description"
        :class="['description', {disabled}]"
      >
        {{ description }}
      </span>
    </span>

  </label>

</template>


<script>

  /**
   * Used to display all options
   */
  export default {
    name: 'kRadioButton',
    model: {
      prop: 'currentValue',
    },
    props: {
      /**
       * Label
       */
      label: {
        type: String,
        required: true,
      },
      /**
       * Description for label
       */
      description: {
        type: String,
        required: false,
      },
      /**
       * Value that is currently assigned via v-model
       */
      currentValue: {
        type: [String, Number, Boolean],
        required: true,
      },
      /**
       * Unique value of this particular radio button
       */
      value: {
        type: [String, Number, Boolean],
        required: true,
      },
      /**
       * Disabled state
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * Autofocus on mount
       */
      autofocus: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      active: false,
    }),
    computed: {
      isChecked() {
        return this.value.toString() === this.currentValue.toString();
      },
      id() {
        return `${this._uid}`;
      },
    },

    methods: {
      focus() {
        this.$refs.input.focus();
      },
      update(event) {
        /**
         * Emits change event
         */
        this.$emit('change', this.isChecked, event);

        // emitting input, resolves browser compatibility issues
        // with v-model's @input default and <input type=radio>
        this.$emit('input', this.value);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $radio-height = 24px

  .k-radio-button
    &.disabled
      color: $core-text-disabled
    &:not(.disabled)
      cursor: pointer
    position: relative
    display:block
    margin-top: 8px
    margin-bottom: 8px

  .input, .text
    // consistent look in inline and block displays
    vertical-align: top

  .input
    // use opacity, not appearance:none because ie compatibility
    opacity: 0
    width: $radio-height
    height: $radio-height

  .checked, .unchecked
    &.active
      // setting opacity to 0 hides input's default outline
      outline: $core-outline
    &.disabled
      fill: $core-grey-300
    // lay our custom radio buttons on top of the actual element
    width: $radio-height
    height: $radio-height
    position: absolute
    left: 0
    top:0
  .checked
    fill: $core-action-normal
  .unchecked
    fill: $core-text-annotation

  .text, .description
    display: inline-block
  .text
    padding-left: 8px
    line-height: $radio-height
    max-width: 'calc(100% - %s)' % $radio-height // stylus specific
  .description
    &:not(.disabled)
      color: $core-text-annotation
    width:100%
    line-height: normal
    font-size: 12px

</style>
