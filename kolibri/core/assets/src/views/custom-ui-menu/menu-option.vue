<template>

  <li
    class="ui-menu-option"
    role="menuitem"
    :class="classes"
    :tabindex="(isDivider || disabled) ? null : '0'"
  >
    <slot v-if="!isDivider">
      <div class="ui-menu-option-content">
        <ui-icon
          class="ui-menu-option-icon"

          :iconSet="iconProps.iconSet"
          :icon="icon"
          :removeText="iconProps.removeText"
          :useSvg="iconProps.useSvg"
          :mirror="iconProps.mirror"

          v-if="icon"
        />

        <div class="ui-menu-option-text">{{ label }}</div>

        <div class="ui-menu-option-secondary-text" v-if="secondaryText">
          {{ secondaryText }}
        </div>
      </div>
    </slot>

    <ui-ripple-ink v-if="!disabled && !isDivider && !disableRipple" />
  </li>

</template>


<script>

  import config from 'keen-ui/src/config';

  import UiIcon from 'keen-ui/src/UiIcon.vue';
  import UiRippleInk from 'keen-ui/src/UiRippleInk.vue';

  export default {
    name: 'uiMenuOption',
    components: {
      UiIcon,
      UiRippleInk,
    },
    props: {
      type: String,
      label: String,
      icon: String,
      iconProps: {
        type: Object,
        default() {
          return {};
        },
      },
      secondaryText: String,
      disableRipple: {
        type: Boolean,
        default: config.data.disableRipple,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      active: {
        type: Boolean,
        default: false,
      },
    },

    computed: {
      classes() {
        return {
          'is-divider': this.isDivider,
          'is-disabled': this.disabled,
          'is-active': this.active,
        };
      },

      isDivider() {
        return this.type === 'divider';
      },
    },
  };

</script>


<style lang="scss">

  @import '~keen-ui/src/styles/imports';

  .ui-menu-option {
      display: block;
      font-family: $font-stack;
      position: relative;
      user-select: none;
      width: 100%;

      &.is-divider {
          background-color: rgba(black, 0.08);
          display: block;
          height: rem-calc(1px);
          margin: rem-calc(6px 0);
          padding: 0;
      }

      &:not(.is-divider) {
          color: $primary-text-color;
          cursor: pointer;
          font-size: $ui-dropdown-item-font-size;
          font-weight: normal;
          min-height: rem-calc(40px);
          outline: none;

          &:hover:not(.is-disabled),
          body[modality="keyboard"] &:focus {
              background-color: #EEEEEE; // rgba(black, 0.1);
          }

          &.is-disabled {
              color: $secondary-text-color;
              cursor: default;
              opacity: 0.5;

              .ui-menu-option-secondary-text {
                  color: $secondary-text-color;
              }
          }
      }
  }

  .ui-menu-option-content {
      align-items: center;
      display: flex;
      height: rem-calc(40px);
      padding: rem-calc(0 16px);
  }

  .ui-menu-option-icon {
      color: $secondary-text-color;
      font-size: rem-calc(18px);
      margin-right: rem-calc(16px);
  }

  .ui-menu-option-text {
      @include text-truncation;
      flex-grow: 1;
  }

  .ui-menu-option-secondary-text {
      color: $hint-text-color;
      flex-shrink: 0;
      font-size: rem-calc(13px);
      margin-left: rem-calc(4px);
  }

</style>
