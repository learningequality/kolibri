<template>

  <!-- HTML makes clicking label apply to input by default -->
  <label class="k-radio-button">
    <!-- v-model listens for @input event by default -->
    <!-- @input has compatibility issues for input of type radio -->
    <!-- Here, manually listen for @change (no compatibility issues) -->
    <input
      ref="input"
      type="radio"
      class="input"
      :id="id"
      :checked="isChecked"
      :value="radiovalue"
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

    <span :class="['text', {disabled}]">
      {{ label }}
      <span
        v-if="description"
        :class="['description', {disabled}]"
      >
        <br>
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
    props: {
      /**
       * Label
       */
      label: {
        type: String,
        required: true,
      },
      /**
       * Description for Label
       */
      description: {
        type: String,
        required: false,
      },
      /**
       * v-model value - the data that is currently assigned
       */
      value: {
        type: [String, Number, Boolean],
        required: true,
      },
      /**
       * Unique value of the particular radio - the data that this button can assign
       */
      radiovalue: {
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
        return this.radiovalue.toString() === this.value.toString();
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
        this.$emit('input', this.radiovalue);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $radio-height = 24px

  .k-radio-button
    // give conditional classes higher priority
    &.disabled
      cursor: default
    position: relative
    cursor: pointer
    display:block
    margin-top: 8px
    margin-bottom: 8px
    line-height: $radio-height

  .input
    // use opacity, not appearance:none because ie compatibility
    opacity: 0
    // bring the invible HTML element on top of our custom radio-button
    position: absolute
    width: $radio-height
    height: $radio-height

  .checked, .unchecked
    vertical-align: top
    &.active
      // setting opacity to 0 hides input's default outline
      outline: $core-outline
    &.disabled
      fill: $core-grey-300
  .checked
    fill: $core-action-normal
  .unchecked
    fill: $core-text-annotation


  .text, .description
    &.disabled
      color: $core-text-disabled
  .text
    display: inline-block
    padding-left: 8px
    max-width: 'calc(100% - %s)' % $radio-height // stylus specific
  .description
    color: $core-text-annotation
    font-size: 12px

</style>
