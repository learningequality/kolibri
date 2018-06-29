<template>

  <li
    role="menuitem"
    class="ui-menu-option"
    :class="classes"
    :tabindex="(isDivider || disabled) ? null : '0'"
    @click="$emit('select')"
    @keydown.enter="$emit('select')"
  >
    <slot v-if="!isDivider">
      <div class="ui-menu-option-content">
        <ui-icon
          v-if="$slots.icon"
          class="ui-menu-option-icon"
        >
          <slot name="icon"></slot>
        </ui-icon>

        <!-- if anything in the dropdown menu has an icon, then we are
        going to add padding to make all the items align -->
        <div
          class="ui-menu-option-text"
          :class="{ 'ui-menu-option-text-lp': !$slots.icon }"
        >
          {{ label }}
        </div>
        <div
          v-if="secondaryText"
          class="ui-menu-option-secondary-text"
        >
          {{ secondaryText }}
        </div>
      </div>
    </slot>

  </li>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'coreMenuOption',
    components: {
      UiIcon,
    },
    props: {
      type: String,
      label: String,
      secondaryText: String,
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
      line-height: 2em;
  }

  .ui-menu-option-secondary-text {
      color: $hint-text-color;
      flex-shrink: 0;
      font-size: rem-calc(13px);
      margin-left: rem-calc(4px);
  }

  .ui-menu-option-text-lp {
    padding-left: 40px
  }

</style>
