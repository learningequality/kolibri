<template>

  <div class="container">

    <!-- HTML makes clicking label apply to input by default -->
    <label class="tr">
      <span class="input-section">
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
          :class="['unchecked', {disabled, active}
          ]"
        />
      </span>

      <span :class="['text', { disabled }]">
        <span class="label">
          {{ label }}
        </span>

        <span
          v-if="description"
          :class="['description', { disabled}]"
        >
          {{ description }}
        </span>
      </span>

    </label>

  </div>

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

  .container
    display: table
    margin-top: 8px
    margin-bottom: 8px

  label
    &.disabled
      cursor: default
    cursor: pointer

  .tr
    display: table-row

  .input-section
    display: table-cell
    position: relative
    vertical-align: top
  .input
    // using this rather than appearance:none because ie compatibility
    opacity: 0
    position: absolute
    width: $radio-height
    height: $radio-height
  .checked, .unchecked
    // give conditional classes higher priority
    // setting opacity to 0 hides input's default outline
    &.active
      outline: $core-outline
    &.disabled
      fill: $core-grey-300
  .checked
    fill: $core-action-normal
  .unchecked
    fill: $core-text-annotation

  .text
    &.disabled
      color: $core-text-disabled
    display: table-cell
    padding-left: 8px
  .label
    line-height: 24px
  .description
    &.disabled
      color: inherit
    display: block
    color: $core-text-annotation
    font-size: 12px

</style>
