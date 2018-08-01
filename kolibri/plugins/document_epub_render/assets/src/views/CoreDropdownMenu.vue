<template>

  <Popper trigger="click" :options="options" class="ib">
    <CoreMenu class="inc-z">
      <slot name="menuOptions" slot="options"></slot>
    </CoreMenu>
    <slot name="button" ref="menuTrigger" slot="reference"></slot>
  </Popper>

</template>


<script>

  import UiPopover from 'keen-ui/src/UiPopover';
  import CoreMenu from 'kolibri.coreVue.components.CoreMenu';
  import Popper from 'vue-popperjs/src/component/popper.js.vue';

  export default {
    name: 'CoreDropdownMenu',
    components: {
      UiPopover,
      CoreMenu,
      Popper,
    },
    props: {
      placement: {
        type: String,
        default: 'bottom-end',
      },
    },
    watch: {},
    computed: {
      options() {
        return {
          placement: this.placement,
          modifiers: {
            preventOverflow: {
              escapeWithReference: true,
            },
          },
        };
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


<style lang="scss" scoped>

  .dib {
    display: inline-block;
  }

  .button-container {
    /deep/ .button {
      margin: 0;
    }
  }

  .ib {
    display: inline-block;
  }

  .inc-z {
    z-index: 8;
  }

</style>
