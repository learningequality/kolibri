<template>

  <component
    :is="htmlTag"
    ref="button"
    dir="auto"
    :class="buttonClasses"
    :type="type"
    :disabled="disabled"
    tabindex="0"
    @click="handleClick"
  >
    <slot v-if="$slots.default"></slot>
    <template v-else>{{ text }}</template>
    <mat-svg
      v-if="hasDropdown"
      category="navigation"
      name="arrow_drop_down"
      class="dropdown-arrow"
    />
  </component>

</template>


<script>

  import { validator } from './appearances.js';
  import buttonMixin from './buttonMixin.js';

  /**
   * The KButton component is used to trigger actions
   */
  export default {
    name: 'KButton',
    mixins: [buttonMixin],
    props: {
      /**
       * Button appearance: 'raised-button', 'flat-button', or 'basic-link'
       */
      appearance: {
        type: String,
        default: 'raised-button',
        validator,
      },
      /**
       * Whether or not button is disabled
       */
      disabled: {
        type: Boolean,
        default: false,
      },
      /**
       * HTML button 'type' attribute (e.g. 'submit', 'reset')
       */
      type: {
        type: String,
        default: 'button',
      },
      /**
       * @private
       * Adds a dropdown arrow
       */
      hasDropdown: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    computed: {
      htmlTag() {
        // Necessary to allow basic links to be rendered as 'inline' instead of
        // 'inline-block': https://stackoverflow.com/a/27770128
        if (this.appearance === 'basic-link') {
          return 'a';
        }
        return 'button';
      },
    },
    methods: {
      handleClick(event) {
        /**
         * Emitted when the button is triggered
         */
        this.$emit('click', event);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import './buttons';

  .dropdown-arrow {
    vertical-align: middle;
  }

</style>
