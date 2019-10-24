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
    class="keen-ui-icon-button"
    :aria-label="ariaLabel || tooltip"
    :class="classes"
    :style="buttonColor"
    :disabled="disabled || loading"
    :type="buttonType"
    tabindex="0"
    @click="onClick"
  >
    <div
      v-if="icon || $slots.default"
      class="keen-ui-icon-button-icon"
      :style="{
        color: !primaryType ? $themeTokens.primary : ''
      }"
    >
      <slot>
        <UiIcon :icon="icon" />
      </slot>
    </div>

    <KCircularLoader
      v-show="loading"

      class="keen-ui-icon-button-progress"
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
    >
      {{ tooltip }}
    </UiTooltip>
  </button>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';
  import UiPopover from 'keen-ui/src/UiPopover';
  import UiTooltip from 'keen-ui/src/UiTooltip';

  export default {
    name: 'KeenUiIconButton',

    components: {
      UiIcon,
      UiPopover,
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
      classes() {
        return [
          `keen-ui-icon-button--type-${this.type}`,
          `keen-ui-icon-button--color-${this.color}`,
          `keen-ui-icon-button--size-${this.size}`,
          { 'is-loading': this.loading },
          { 'is-disabled': this.disabled || this.loading },
          { 'has-dropdown': this.hasDropdown },
          this.$computedClass({ ':focus': { ...this.$coreOutline, outlineOffset: '-4px' } }),
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
            backgroundColor: this.$themeTokens.primary,
          };
          if (this.dropdownOpen) {
            style[':hover:not(.is-disabled)'] = {
              backgroundColor: this.$themeTokens.primaryDark,
            };
          }
          return style;
        } else if (this.primaryColor && !this.primaryType) {
          return {
            color: this.$themeTokens.primary,
            fill: this.$themeTokens.primary,
          };
        }

        return {};
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

      /**
       * @public
       */
      openDropdown() {
        if (this.$refs.dropdown) {
          this.$refs.dropdown.open();
        }
      },

      /**
       * @public
       */
      // eslint-disable-next-line
      closeDropdown() {
        if (this.$refs.dropdown) {
          this.$refs.dropdown.close();
        }
      },

      /**
       * @public
       */
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

  $keen-ui-icon-button-size: rem-calc(36px) !default;
  $keen-ui-icon-button--size-small: rem-calc(32px) !default;
  $keen-ui-icon-button--size-large: rem-calc(48px) !default;

  .keen-ui-icon-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: $keen-ui-icon-button-size;
    height: $keen-ui-icon-button-size;
    padding: 0;
    margin: 0;
    overflow: hidden;
    cursor: pointer;
    background: none;
    border: 0;
    border-radius: 50%;

    &.is-loading {
      .keen-ui-icon-button-icon {
        opacity: 0;
      }
    }

    &.is-disabled {
      cursor: default;
      opacity: 0.6;
    }

    svg {
      vertical-align: middle;
    }
  }

  .keen-ui-icon-button-icon {
    position: relative;
    z-index: 1;
    width: 100%; // Firefox: needs the width and height reset for flexbox centering
    height: initial;
    opacity: 1;
    transition: opacity 0.2s ease;
    transition-delay: 0.1s;
  }

  .ui-progress-circular.keen-ui-icon-button-progress {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  // ================================================
  // Sizes
  // ================================================

  .keen-ui-icon-button--size-small {
    width: $keen-ui-icon-button--size-small;
    height: $keen-ui-icon-button--size-small;

    .ui-icon {
      font-size: rem-calc(18px);
    }
  }

  .keen-ui-icon-button--size-large {
    width: $keen-ui-icon-button--size-large;
    height: $keen-ui-icon-button--size-large;
  }

  // ================================================
  // Colors
  // ================================================

  .keen-ui-icon-button--color-black,
  .keen-ui-icon-button--color-white {
    background-color: transparent;

    &:hover:not(.is-disabled),
    &.has-dropdown-open {
      background-color: rgba(black, 0.1);
    }
  }

  .keen-ui-icon-button--color-black {
    color: $secondary-text-color;

    .keen-ui-icon-button-icon {
      color: $secondary-text-color;
    }
  }

  .keen-ui-icon-button--color-white {
    color: $secondary-text-color;

    .keen-ui-icon-button-icon {
      color: white;
    }
  }

  // ================================================
  // Types
  // ================================================

  .keen-ui-icon-button--type-primary {
    &.keen-ui-icon-button--color-default {
      background-color: $md-grey-200;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-grey-200, 7.5%);
      }

      .ui-ripple-ink__ink {
        opacity: 0.2;
      }

      .keen-ui-icon-button-icon {
        color: $primary-text-color;
      }
    }

    &.keen-ui-icon-button--color-primary,
    &.keen-ui-icon-button--color-accent,
    &.keen-ui-icon-button--color-green,
    &.keen-ui-icon-button--color-orange,
    &.keen-ui-icon-button--color-red {
      color: white;

      .ui-ripple-ink__ink {
        opacity: 0.4;
      }
    }

    &.keen-ui-icon-button--color-accent {
      background-color: $brand-accent-color;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($brand-accent-color, 10%);
      }
    }

    &.keen-ui-icon-button--color-green {
      background-color: $md-green;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-green, 10%);
      }
    }

    &.keen-ui-icon-button--color-orange {
      background-color: $md-orange;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-orange, 10%);
      }
    }

    &.keen-ui-icon-button--color-red {
      background-color: $md-red;

      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: darken($md-red, 10%);
      }
    }
  }

  .keen-ui-icon-button--type-secondary {
    &.keen-ui-icon-button--color-default {
      color: $primary-text-color;

      .keen-ui-icon-button-icon {
        color: $primary-text-color;
      }
    }

    &.keen-ui-icon-button--color-default,
    &.keen-ui-icon-button--color-primary,
    &.keen-ui-icon-button--color-accent,
    &.keen-ui-icon-button--color-green,
    &.keen-ui-icon-button--color-orange,
    &.keen-ui-icon-button--color-red {
      &:hover:not(.is-disabled),
      &.has-dropdown-open {
        background-color: rgba(black, 0.1);
      }
    }

    &.keen-ui-icon-button--color-accent {
      color: $brand-accent-color;

      .keen-ui-icon-button-icon {
        color: $brand-accent-color;
      }
    }

    &.keen-ui-icon-button--color-green {
      color: $md-green-600;

      .keen-ui-icon-button-icon {
        color: $md-green-600;
      }
    }

    &.keen-ui-icon-button--color-orange {
      color: $md-orange;

      .keen-ui-icon-button-icon {
        color: $md-orange;
      }
    }

    &.keen-ui-icon-button--color-red {
      color: $md-red;

      .keen-ui-icon-button-icon {
        color: $md-red;
      }
    }
  }
  /* stylelint-enable */

</style>
