<template>

  <div
    class="container"
    :class="{ 'disabled': disabled }"
    @click="select"
  >

    <label class="tr">
      <!-- TODO no block level within label -->
      <div class="input-section">
        <input
          ref="kRadioInput"
          type="radio"
          class="input"
          :id="id"
          :value="radiovalue"
          :disabled="disabled"
          :autofocus="autofocus"
          @focus="isActive = true"
          @blur="isActive = false"
          @change="emitChange"
          v-model="model"
          @click.stop="select"
        >

        <mat-svg
          v-if="isCurrentlySelected"
          category="toggle"
          name="radio_button_checked"
          class="radio-bubble selected"
          :class="{ 'active': isActive }"
        />
        <mat-svg
          v-else
          category="toggle"
          name="radio_button_unchecked"
          class="radio-bubble unselected"
          :class="{ 'active': isActive }"
        />
      </div>

      <p class="text">
        <span class="label">
          {{ label }}
        </span>

        <span class="description">
          {{ description }}
        </span>
      </p>

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
       * v-model value
       */
      value: {
        type: [String, Number, Boolean],
        required: true,
      },
      /**
       * Unique value of the particular radio
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
      isActive: false,
    }),
    computed: {
      model: {
        get() {
          return this.value;
        },
        set(val) {
          this.$emit('input', val);
        },
      },
      isCurrentlySelected() {
        return this.radiovalue.toString() === this.model.toString();
      },
      id() {
        return `${this._uid}`;
      },
    },

    methods: {
      focus() {
        this.$refs.kRadioInput.focus();
      },
      select() {
        if (!this.disabled) {
          this.focus();
          this.model = this.radiovalue;
          this.emitChange();
        }
      },
      emitChange(event) {
        if (this.model !== this.radiovalue) {
          /**
           * Emits change event
           */
          this.$emit('change', this.model, event);
        }
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

  .tr
    display: table-row

  .input-section
    display: table-cell
    position: relative
    vertical-align: top
    width: $radio-height
    height: $radio-height
    cursor: pointer

  .input
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    opacity: 0
    cursor: pointer

  .selected
    fill: $core-action-normal

  .unselected
    fill: $core-text-annotation

  .radio-bubble.active
    outline: $core-outline

  .text
    display: table-cell
    padding-left: 8px
    cursor: pointer
    // user-select: none // why?

  .label
    line-height: 24px

  .description
    display: block
    color: $core-text-annotation
    font-size: 12px

  .disabled
    svg
      fill: $core-grey-300

    .input-section, .input, .label
      cursor: default

    .text
      color: $core-text-disabled

    .description
      // need it more specific
      color: $core-text-disabled

</style>
