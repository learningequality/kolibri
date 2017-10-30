<template>

  <div
    class="k-radio-container"
    :class="{ 'k-radio-disabled': disabled }"
    @click="select"
  >
    <div class="tr">

      <div class="k-radio" :class="{ 'k-radio-active': isActive }">
        <input
          ref="kRadioInput"
          type="radio"
          class="k-radio-input"
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
          class="k-radio-selected"
        />
        <mat-svg
          v-else
          category="toggle"
          name="radio_button_unchecked"
          class="k-radio-unselected"
        />

      </div>

      <label :for="id" class="k-radio-label" @click.prevent>{{ label }}</label>

    </div>
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
        return `k-radio-${this._uid}`;
      },
    },

    methods: {
      select() {
        if (!this.disabled) {
          this.$refs.kRadioInput.focus();
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

  .k-radio-container
    display: table
    margin-top: 8px
    margin-bottom: 8px

  .tr
    display: table-row

  .k-radio
    display: table-cell
    position: relative
    vertical-align: top
    width: $radio-height
    height: $radio-height
    cursor: pointer

  .k-radio-input
    position: absolute
    top: 50%
    left: 50%
    transform: translate(-50%, -50%)
    opacity: 0
    cursor: pointer

  .k-radio-selected
    fill: $core-action-normal

  .k-radio-unselected
    fill: $core-text-annotation

  .k-radio-active
    .k-radio-selected
      outline: $core-outline

  .k-radio-label
    display: table-cell
    padding-left: 8px
    cursor: pointer
    line-height: 24px
    user-select: none

  .k-radio-disabled
    svg
      fill: $core-grey-300

    .k-radio, .k-radio-input, .k-radio-label
      cursor: default

    .k-radio-label
      color: $core-text-disabled

</style>
