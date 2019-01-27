<template>

  <!--
     This component was forked from the Keen library in order to handle
     dynamic styling.

     The formatting has been changed to match our linters. We may eventually
     want to simply consolidate it with our component and remove any unused
     functionality.
    -->
  <button
    ref="button"
    class="ui-icon-button"

    :aria-label="ariaLabel || tooltip"
    :class="classes"
    :disabled="disabled || loading"
    :type="buttonType"

    @click="onClick"
  >
    <div
      v-if="icon || $slots.default"
      class="ui-icon-button-icon"
      :style="{
        color: !primaryType ? $coreActionNormal : ''
      }"
    >
      <slot>
        <UiIcon :icon="icon" />
      </slot>
    </div>

    <KCircularLoader
      v-show="loading"

      class="ui-icon-button-progress"
      :size="size === 'large' ? 24 : 18"

      :stroke="4.5"
    />

    <UiPopover
      v-if="hasDropdown"
      ref="dropdown"

      trigger="button"
      :dropdownPosition="dropdownPosition"

      :openOn="openDropdownOn"
      @close="onDropdownClose"

      @open="onDropdownOpen"
    >
      <slot name="dropdown"></slot>
    </UiPopover>

    <UiTooltip
      v-if="tooltip"

      trigger="button"
      :openOn="openTooltipOn"

      :position="tooltipPosition"
    >{{ tooltip }}</UiTooltip>
  </button>

</template>


<script>

  import { mapGetters } from 'vuex';
  import UiIcon from 'keen-ui/src/UiIcon';
  import UiPopover from 'keen-ui/src/UiPopover';
  import UiTooltip from 'keen-ui/src/UiTooltip';
  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import { darken } from 'kolibri.utils.colour';

  export default {
    name: 'KeenUiIconButton',

    components: {
      UiIcon,
      UiPopover,
      KCircularLoader,
      UiTooltip,
    },

    props: {
      type: {
        type: String,
        default: 'primary', // 'primary' or 'secondary'
      },
      buttonType: {
        type: String,
        default: 'button',
      },
      color: {
        type: String,
        default: 'default', // 'default', 'primary', 'accent', 'green', 'orange', or 'red'
      },
      size: {
        type: String,
        default: 'normal', // 'small', normal', or 'large'
      },
      icon: String,
      ariaLabel: String,
      loading: {
        type: Boolean,
        default: false,
      },
      hasDropdown: {
        type: Boolean,
        default: false,
      },
      dropdownPosition: {
        type: String,
        default: 'bottom left',
      },
      openDropdownOn: {
        type: String,
        default: 'click', // 'click', 'hover', 'focus', or 'always'
      },
      tooltip: String,
      openTooltipOn: String,
      tooltipPosition: String,
      disabled: {
        type: Boolean,
        default: false,
      },
    },

    data() {
      return {
        dropdownOpen: this.openDropdownOn === 'always',
      };
    },

    computed: {
      ...mapGetters(['$coreActionNormal']),
      classes() {
        return [
          `ui-icon-button--type-${this.type}`,
          `ui-icon-button--color-${this.color}`,
          `ui-icon-button--size-${this.size}`,
          { 'is-loading': this.loading },
          { 'is-disabled': this.disabled || this.loading },
          { 'has-dropdown': this.hasDropdown },
          this.$computedClass(this.buttonColor),
        ];
      },

      primaryType() {
        return this.type === 'primary';
      },
      primaryColor() {
        return this.color === 'primary';
      },
      buttonColor() {
        if (this.primaryColor && this.primaryType) {
          const style = {
            backgroundColor: this.$coreActionNormal,
          };
          if (this.dropdownOpen) {
            style[':hover:not(.is-disabled)'] = {
              backgroundColor: darken(this.$coreActionNormal, '10%'),
            };
          }
          return style;
        } else if (this.primaryColor && !this.primaryType) {
          return {
            color: this.$coreActionNormal,
          };
        }
      },
      focusRingStyle() {
        if (this.primaryColor) {
          return {
            backgroundColor: darken(this.$coreActionNormal, '15%'),
          };
        }
      },
    },

    methods: {
      onClick(e) {
        this.$emit('click', e);
      },

      onDropdownOpen() {
        this.dropdownOpen = true;
        this.$emit('dropdown-open');
      },

      onDropdownClose() {
        this.dropdownOpen = false;
        this.$emit('dropdown-close');
      },

      openDropdown() {
        if (this.$refs.dropdown) {
          this.$refs.dropdown.open();
        }
      },

      closeDropdown() {
        if (this.$refs.dropdown) {
          this.$refs.dropdown.close();
        }
      },

      toggleDropdown() {
        if (this.$refs.dropdown) {
          this.$refs.dropdown.toggle();
        }
      },
    },
  };

</script>


<style lang="scss">

  @import '~keen-ui/src/styles/imports';

  /* stylelint-disable csstree/validator */

  $ui-icon-button-size: rem-calc(36px) !default;
  $ui-icon-button--size-small: rem-calc(32px) !default;
  $ui-icon-button--size-large: rem-calc(48px) !default;

  .ui-icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: $ui-icon-button-size;
    height: $ui-icon-button-size;
    padding: 0;
    margin: 0;
    overflow: hidden;
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: 50%;
    outline: none;

    /* stylelint-disable property-no-vendor-prefix */
    // Fix for border radius not clipping internal content of positioned elements (Chrome/Opera)
    -webkit-mask-image: -webkit-radial-gradient(circle, white, black);

    // Remove the Firefox dotted outline
    &::-moz-focus-inner {
      border: 0;
    }

    &.is-loading {
      .ui-icon-button-icon {
        opacity: 0;
      }
    }

    &.is-disabled {
      cursor: default;
      opacity: 0.6;
    }
  }

  .ui-icon-button-icon {
    position: relative;
    z-index: 1;
    width: 100%; // Firefox: needs the width and height reset for flexbox centering
    height: initial;
    opacity: 1;
    transition: opacity 0.2s ease;
    transition-delay: 0.1s;
  }

  .ui-progress-circular.ui-icon-button-progress {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  // ================================================
  // Sizes
  // ================================================

  .ui-icon-button--size-small {
    width: $ui-icon-button--size-small;
    height: $ui-icon-button--size-small;

    .ui-icon {
      font-size: rem-calc(18px);
    }
  }

  .ui-icon-button--size-large {
    width: $ui-icon-button--size-large;
    height: $ui-icon-button--size-large;
  }

  // ================================================
  // Colors
  // ================================================

  .ui-icon-button--color-black,
  .ui-icon-button--color-white {
    background-color: transparent;

    &:hover:not(.is-disabled),
    &.has-dropdown-open {
      background-color: rgba(black, 0.1);
    }
  }

  .ui-icon-button--color-black {
    color: $secondary-text-color;

    .ui-icon-button-icon {
      color: $secondary-text-color;
    }
  }

  .ui-icon-button--color-white {
    color: $secondary-text-color;

    .ui-icon-button-icon {
      color: white;
    }
  }

  // ================================================
  // Types
  // ================================================

  .ui-icon-button--type-primary {
    &.ui-icon-button--color-default {
      background-color: $md-grey-200;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-grey-200, 7.5%);
      }

      .ui-ripple-ink__ink {
        opacity: 0.2;
      }

      .ui-icon-button-icon {
        color: $primary-text-color;
      }
    }

    &.ui-icon-button--color-primary,
    &.ui-icon-button--color-accent,
    &.ui-icon-button--color-green,
    &.ui-icon-button--color-orange,
    &.ui-icon-button--color-red {
      color: white;

      .ui-ripple-ink__ink {
        opacity: 0.4;
      }
    }

    &.ui-icon-button--color-accent {
      background-color: $brand-accent-color;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($brand-accent-color, 10%);
      }
    }

    &.ui-icon-button--color-green {
      background-color: $md-green;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-green, 10%);
      }
    }

    &.ui-icon-button--color-orange {
      background-color: $md-orange;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-orange, 10%);
      }
    }

    &.ui-icon-button--color-red {
      background-color: $md-red;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-red, 10%);
      }
    }
  }

  .ui-icon-button--type-secondary {
    &.ui-icon-button--color-default {
      color: $primary-text-color;

      .ui-icon-button-icon {
        color: $primary-text-color;
      }
    }

    &.ui-icon-button--color-default,
    &.ui-icon-button--color-primary,
    &.ui-icon-button--color-accent,
    &.ui-icon-button--color-green,
    &.ui-icon-button--color-orange,
    &.ui-icon-button--color-red {
      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: rgba(black, 0.1);
      }
    }

    &.ui-icon-button--color-accent {
      color: $brand-accent-color;

      .ui-icon-button-icon {
        color: $brand-accent-color;
      }
    }

    &.ui-icon-button--color-green {
      color: $md-green-600;

      .ui-icon-button-icon {
        color: $md-green-600;
      }
    }

    &.ui-icon-button--color-orange {
      color: $md-orange;

      .ui-icon-button-icon {
        color: $md-orange;
      }
    }

    &.ui-icon-button--color-red {
      color: $md-red;

      .ui-icon-button-icon {
        color: $md-red;
      }
    }
  }
  /* stylelint-enable */

</style>
