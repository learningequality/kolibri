<template>

  <li>
    <a
      v-if="!isDivider"
      :href="link"
      class="core-menu-option"
      role="menuitem"
      :class="coreMenuOptionClasses"
      :tabindex="(isDivider || disabled) ? null : '0'"
      @click="conditionalEmit"
      @keydown.enter="conditionalEmit"
    >
      <slot>
        <div class="core-menu-option-content" :class="$computedClass(optionContentStyle)">
          <KLabeledIcon>
            <KIcon
              slot="icon"
              :icon="icon"
              :class="$computedClass(optionIconStyle)"
            />
            <div>{{ label }}</div>
          </KLabeledIcon>

          <div
            v-if="secondaryText"
          >{{ secondaryText }}</div>
        </div>
      </slot>
    </a>
    <span v-else class="divider" :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"></span>
  </li>

</template>


<script>

  export default {
    name: 'CoreMenuOption',
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
      coreMenuOptionClasses() {
        return {
          'is-divider': this.isDivider,
          'is-disabled': this.disabled,
          'is-active': this.active,
          [this.$computedClass(this.optionStyle)]: true,
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
          {
            ":focus body[modality='keyboard']": bg,
          }
        );
      },
      optionContentStyle() {
        let backgroundColor = '';
        let color = this.$themePalette.grey.v_600;
        let hover = {
          backgroundColor: this.$themePalette.grey.v_200,
        };

        if (!this.isDivider) {
          if (this.active) {
            backgroundColor = this.$themeBrand.primary.v_50;
            color = this.$themeTokens.primary;
            hover['color'] = this.$themeTokens.primaryDark;
          } else {
            hover['color'] = '#000000';
          }
        }

        return {
          backgroundColor,
          color,
          ':hover': hover,
        };
      },
      optionIconStyle() {
        let fill = this.$themePalette.grey.v_600;
        if (this.active) {
          fill = this.$themeTokens.primary;
        }
        if (this.hover) {
          fill = '#000';
        }
        return {
          fill,
        };
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

  @import '~kolibri.styles.definitions';

  .core-menu-option {
    height: 48px;
    padding-top: 4px;
    padding-bottom: 4px;
    font-size: 16px;
    text-decoration: none;
  }
  .core-menu-option-content {
    display: -webkit-box;
    display: -ms-flexbox;
    display: flex;
    align-items: center;
    height: 2.5rem;
    padding: 0 8px;
    margin: 4px 8px 0;
    -webkit-box-align: center;
    -ms-flex-align: center;
    border-radius: $radius;
  }
  .divider {
    display: block;
    min-width: 100%;
    height: 1px;
    margin: 8px 0;
    overflow-y: hidden;
  }

</style>
