<template>

  <div
    class="k-radio-container"
    :class="{ 'k-radio-disabled': disabled }"
    @click.prevent="select"
  >
    <div class="tr">

      <div class="k-radio" :class="{ 'k-radio-active': isActive }">
        <input
          type="radio"
          class="k-radio-input"
          :name="name"
          :value="radiovalue"
          :checked="isCurrentlySelected"
          :disabled="disabled"
          @change.stop="select"
          @focus="isActive = true"
          @blur="isActive = false"
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

      <label v-if="label" :for="name" class="k-radio-label">{{ label }}</label>

    </div>
  </div>

</template>


<script>

  /**
    * A radio
    */
  export default {
    name: 'k-radio',
    props: {
      /**
       * Name attribute
       */
      name: {
        type: String,
        required: false,
      },
      /**
       * Text label
       */
      label: {
        type: String,
        required: false,
      },
      value: {
        type: [String, Boolean, Number],
        required: true,
      },
      /**
       * Value of the radio
       */
      radiovalue: {
        type: [String, Boolean, Number],
        required: true,
      },
      /**
       * Disabled state
       */
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      isActive: false,
      currentValue: '',
    }),
    computed: {
      isCurrentlySelected() {
        return (
          typeof this.value !== 'undefined' &&
          this.value !== null &&
          this.radiovalue.toString() === this.value.toString()
        );
      },
    },
    watch: {
      value(newValue) {
        console.log('changed');
        this.currentValue = newValue;
      },
    },
    created() {
      this.currentValue = this.value;
    },
    methods: {
      select(event) {
        if (!this.disabled) {
          console.log('value', this.value);
          this.$emit('change', this.radiovalue, event);
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
    // opacity: 0
    cursor: pointer

  .k-radio-selected
    fill: $core-action-normal

  .k-radio-unselected
    fill: $core-text-annotation

  .k-radio-active
    .k-radio-selected
      fill: $core-action-dark

    .k-radio-unselected
      fill: $core-text-default

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

</style>
