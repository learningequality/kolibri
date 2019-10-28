<template>

  <li>
    <span
      v-if="isDivider"
      class="divider"
      :style="{ borderTop: `solid 1px ${$themeTokens.fineLine}` }"
    >
    </span>
    <a
      v-else
      :href="link"
      class="core-menu-option"
      role="menuitem"
      :class="coreMenuOptionClasses"
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
  </li>

</template>


<script>

  export default {
    name: 'CoreMenuOption',
    props: {
      isDivider: Boolean,
      label: String,
      link: String,
      secondaryText: String,
      icon: String,
    },
    inject: ['showActive'],
    computed: {
      coreMenuOptionClasses() {
        return {
          'is-active': this.active,
          [this.$computedClass(this.optionStyle)]: true,
        };
      },
      active() {
        let showActive = typeof this.showActive !== 'undefined' ? this.showActive : true;
        return showActive && window.location.pathname.startsWith(this.link);
      },
      optionStyle() {
        let color = '';
        if (this.active) {
          color = this.$themeTokens.primary;
        } else {
          color = this.$themeTokens.text;
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
        let color = '#000';
        let hover = {
          backgroundColor: this.$themeBrand.primary.v_50,
        };
        let fontWeight = 'normal';

        if (this.active) {
          backgroundColor = this.$themeBrand.primary.v_50;
          color = this.$themeTokens.primaryDark;
          fontWeight = 'bold';
        }

        return {
          backgroundColor,
          color,
          fontWeight,
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
    display: flex;
    align-items: center;
    height: 2.5rem;
    padding: 0 8px;
    margin: 4px 8px 0;
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
