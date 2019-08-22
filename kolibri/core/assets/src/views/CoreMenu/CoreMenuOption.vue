<template>

  <li>
    <a
      :href="link"
      class="ui-menu-option"
      role="menuitem"
      :class="classes"
      :style="optionStyle"
      :tabindex="(isDivider || disabled) ? null : '0'"
      @click="conditionalEmit"
      @keydown.enter="conditionalEmit"
    >
      <slot v-if="!isDivider">
        <div class="ui-menu-option-content">
          <KLabeledIcon :style="disable ? { color: $themeTokens.textDisabled } : {}">
            <KIcon
              slot="icon"
              :icon="icon"
              :color="disable ? { color: $themeTokens.textDisabled } : {}"
              class="ui-menu-option-icon"
            />
            <div
              class="ui-menu-option-text"
            >{{ label }}</div>
          </KLabeledIcon>

          <div
            v-if="secondaryText"
          >{{ secondaryText }}</div>
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
      icon: String,
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    inject: ['showActive'],
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
        let showActive = typeof this.showActive !== 'undefined' ? this.showActive : true;
        return showActive && window.location.pathname.startsWith(this.link);
      },
      optionStyle() {
        let color = '';
        if (!this.isDivider) {
          if (this.active) {
            color = this.$themeTokens.primary;
          } else if (this.disabled) {
            color = this.$themeTokens.annotation;
          } else {
            color = this.$themeTokens.text;
          }
        }
        const bg = {
          backgroundColor: this.$themePalette.grey.v_200,
        };
        return Object.assign(
          {
            color,
          },
          this.disabled
            ? {}
            : {
                ':hover': bg,
              },
          {
            ":focus body[modality='keyboard']": bg,
          }
        );
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
      cursor: pointer;
      outline: none;

      &.is-disabled {
        cursor: default;
        opacity: 0.5;
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
  }

  .ui-menu-option-text-lp {
    padding-left: 40px;
  }

  /* stylelint-enable */

</style>
