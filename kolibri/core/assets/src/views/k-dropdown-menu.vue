<template>

  <div class="dib">
    <!-- Added because the trigger could not be a vue element smh-->
    <div
      ref="buttonContainer"
      class="button-container dib"
    >
      <k-button
        ref="button"
        :text="text"
        :appearance="appearance"
        :primary="primary"
        :disabled="disabled"
        :hasDropdown="true"
      />
    </div>

    <ui-popover
      v-if="!disabled"
      ref="popover"
      trigger="buttonContainer"
      :containFocus="false"
      :position="position"
      @close="handleClose"
      @open="handleOpen"
    >
      <ui-menu
        :options="options"
        @select="handleSelection"
      />
    </ui-popover>

  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import UiPopover from 'keen-ui/src/UiPopover';
  import uiMenu from 'keen-ui/src/UiMenu';
  import { validator } from './buttons-and-links/appearances';

  /**
   * The kDropdownMenu component is used to contain multiple actions
   */
  export default {
    name: 'kDropdownMenu',
    components: {
      kButton,
      UiPopover,
      uiMenu,
    },
    props: {
      /**
       * Button label text
       */
      text: {
        type: String,
        required: true,
      },
      /**
       * Button appearance: 'raised-button', 'flat-button', or 'basic-link'
       */
      appearance: {
        type: String,
        required: false,
        default: 'raised-button',
        validator,
      },
      /**
       * For 'raised-button' and 'flat-button' appearances: show as primary or secondary style
       */
      primary: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * Whether or not button is disabled
       */
      disabled: {
        type: Boolean,
        required: false,
        default: false,
      },
      /**
       * An array of option objects
       */
      options: {
        type: Array,
        required: true,
      },
      /**
       * The position of the dropdown relative to the button
       */
      position: {
        type: String,
        required: false,
        default: 'bottom right',
        validator(val) {
          return [
            'bottom left',
            'bottom center',
            'bottom right',
            'top left',
            'top center',
            'top right',
            'left top',
            'left middle',
            'left bottom',
            'right top',
            'right middle',
            'right bottom',
          ].includes(val);
        },
      },
    },
    beforeDestroy() {
      window.removeEventListener('keyup', this.handleKeyUp, true);
    },
    methods: {
      handleOpen() {
        window.addEventListener('keyup', this.handleKeyUp, true);
      },
      handleClose() {
        const focusedElement = document.activeElement;
        const popover = this.$refs.popover.$el;
        if (
          popover.contains(focusedElement) &&
          (focusedElement.classList.contains('ui-popover') ||
            focusedElement.classList.contains('ui-popover__focus-redirector') ||
            focusedElement.classList.contains('ui-menu-option'))
        ) {
          this.focusOnButton();
        }
        window.removeEventListener('keyup', this.handleKeyUp, true);
      },
      handleKeyUp(event) {
        if (event.shiftKey && event.keyCode == 9) {
          const popover = this.$refs.popover.$el;
          const popoverIsOpen = popover.clientWidth > 0 && popover.clientHeight > 0;
          if (popoverIsOpen && !popover.contains(document.activeElement)) {
            this.closePopover();
            this.focusOnButton();
          }
        }
      },
      handleSelection(selection) {
        /**
         * Emitted when the an option is selected.
         */
        this.$emit('select', selection);
        this.closePopover();
      },
      closePopover() {
        this.$refs.popover.close();
      },
      focusOnButton() {
        this.$refs.button.$el.focus();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .dib
    display: inline-block

  .button-container
    >>>.button
      margin: 0

</style>
