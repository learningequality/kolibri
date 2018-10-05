<template>

  <li>
    <a
      :href="link"
      class="ui-menu-option"
      role="menuitem"
      :class="classes"
      :tabindex="(isDivider || disabled) ? null : '0'"
      @click="conditionalEmit"
      @keydown.enter="conditionalEmit"
    >
      <slot v-if="!isDivider">
        <div class="ui-menu-option-content">
          <UiIcon
            v-if="$slots.icon"
            class="ui-menu-option-icon"
          >
            <slot name="icon"></slot>
          </UiIcon>

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
    </a>
  </li>

</template>


<script>

  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'CoreMenuOption',
    components: {
      UiIcon,
    },
    props: {
      type: String,
      label: String,
      link: String,
      secondaryText: String,
      disabled: {
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

      active() {
        return window.location.pathname.startsWith(this.link);
      },
    },
    methods: {
      conditionalEmit() {
        if (!this.link) {
          this.$emit('select');
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~keen-ui/src/styles/imports';

  /* stylelint-disable csstree/validator */

  .ui-menu-option {
    position: relative;
    display: block;
    width: 100%;
    text-decoration: inherit;
    user-select: none;

    &.is-divider {
      display: block;
      height: rem-calc(1px);
      padding: 0;
      margin: rem-calc(6px 0);
      background-color: rgba(black, 0.08);
    }

    &:not(.is-divider) {
      min-height: rem-calc(40px);
      font-size: $ui-dropdown-item-font-size;
      font-weight: normal;
      color: $primary-text-color;
      cursor: pointer;
      outline: none;

      &:hover:not(.is-disabled),
      body[modality='keyboard'] &:focus {
        background-color: #eeeeee; // rgba(black, 0.1);
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
    display: flex;
    align-items: center;
    height: rem-calc(40px);
    padding: rem-calc(0 16px);
  }

  .ui-menu-option-icon {
    margin-right: rem-calc(16px);
    font-size: rem-calc(18px);
    color: $secondary-text-color;
  }

  .ui-menu-option-text {
    @include text-truncation;

    flex-grow: 1;
    line-height: 2em;
  }

  .ui-menu-option-secondary-text {
    flex-shrink: 0;
    margin-left: rem-calc(4px);
    font-size: rem-calc(13px);
    color: $hint-text-color;
  }

  .ui-menu-option-text-lp {
    padding-left: 40px;
  }

  /* stylelint-enable */

</style>
