<template>

  <div>
    <div
      v-if="!disabled"
      class="focus-trap-first"
      tabindex="0"
      @focus="handleFirstTrapFocus"
    ></div>

    <slot></slot>

    <div
      v-if="!disabled"
      class="focus-trap-last"
      tabindex="0"
      @focus="handleLastTrapFocus"
    ></div>
  </div>

</template>


<script>

  /**
   * This component ensures that focus moves between the first element
   * and the last element of content provided by the default slot.
   * In disabled state, it only renders whatever has been passed
   * to the default slot, and doesn't add any focus trap behavior,
   * allowing for flexible use from parent components.
   */
  export default {
    name: 'FocusTrap',
    props: {
      disabled: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        isTrapActive: false,
      };
    },
    methods: {
      handleFirstTrapFocus(e) {
        e.stopPropagation();
        if (!this.isTrapActive) {
          // On first focus, redirect to first option, then activate trap
          this.focusFirstEl();
          this.isTrapActive = true;
        } else {
          this.focusLastEl();
        }
      },
      handleLastTrapFocus(e) {
        e.stopPropagation();
        this.focusFirstEl();
      },
      focusFirstEl() {
        this.$emit('shouldFocusFirstEl');
      },
      focusLastEl() {
        this.$emit('shouldFocusLastEl');
      },
      /**
       * @public
       * Reset the next focus to the first focus element
       */
      reset() {
        this.isTrapActive = false;
      },
    },
  };

</script>
