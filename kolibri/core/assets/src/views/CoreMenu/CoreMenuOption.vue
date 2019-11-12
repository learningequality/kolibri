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
      :class="$computedClass(optionStyle)"
      :tabindex="link ? false : '0'"
      @click="conditionalEmit"
      @keydown.enter="conditionalEmit"
    >
      <slot>
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
      active() {
        let showActive = typeof this.showActive !== 'undefined' ? this.showActive : true;
        return showActive && window.location.pathname.startsWith(this.link);
      },
      optionStyle() {
        if (this.active) {
          return {
            color: this.$themeTokens.primaryDark,
            fontWeight: 'bold',
            backgroundColor: this.$themeBrand.primary.v_50,
            ':hover': {
              backgroundColor: this.$themeBrand.primary.v_100,
            },
          };
        }
        return {
          color: this.$themeTokens.text,
          ':hover': {
            backgroundColor: this.$themeBrand.primary.v_50,
          },
        };
      },
      optionIconStyle() {
        if (this.active) {
          return { fill: this.$themeTokens.primary };
        }
        return { fill: this.$themePalette.grey.v_600 };
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
    display: block;
    padding: 8px;
    margin: 4px 8px;
    font-size: 16px;
    text-decoration: none;
    border-radius: $radius;
    outline-offset: -1px; // override global styles
    transition: background-color $core-time ease;

    &:hover {
      outline-offset: -1px; // override global styles
    }
  }

  .divider {
    display: block;
    min-width: 100%;
    height: 1px;
    margin: 8px 0;
    overflow-y: hidden;
  }

</style>
