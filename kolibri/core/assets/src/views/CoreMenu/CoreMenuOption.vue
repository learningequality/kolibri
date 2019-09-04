<template>

  <li>
    <a
      :href="link"
      class="core-menu-option"
      role="menuitem"
      :class="classes"
      :style="optionStyle"
      :tabindex="(isDivider || disabled) ? null : '0'"
      @click="conditionalEmit"
      @keydown.enter="conditionalEmit"
    >
      <slot v-if="!isDivider">
        <div class="core-menu-option-content" :style="optionContentStyle">
          <KLabeledIcon>
            <KIcon
              slot="icon"
              :icon="icon"
              :style="optionIconStyle"
            />
            <div>{{ label }}</div>
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
      optionContentStyle() {
        let backgroundColor = '';
        let color = this.$themePalette.grey.v_600;
        if (!this.isDivider) {
          if (this.active) {
            backgroundColor = this.$themeBrand.primary.v_50;
            color = this.$themeTokens.primary;
          }
        }
        return Object.assign(
          {
            backgroundColor,
            color,
            ':hover': {
              backgroundColor: '#ff0',
              color: '#000',
            },
          },
        );
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

</style>
