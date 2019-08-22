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
        <div class="core-menu-option-content">
          <KLabeledIcon>
            <KIcon
              slot="icon"
              :icon="icon"
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

  .core-menu-option {
    min-height: 2.5rem;
    padding-top: 4px;
    padding-bottom: 4px;
  }
  .core-menu-option-content {
    height: 2.5rem;
  }

</style>
