<template>

  <li>
    <a
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
          <template #icon>
            <KIcon
              :icon="icon"
              :class="$computedClass(optionIconStyle)"
            />
          </template>
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
      label: {
        type: String,
        required: true,
      },
      link: {
        type: String,
        default: null,
      },
      secondaryText: {
        type: String,
        default: null,
      },
      icon: {
        type: String,
        required: true,
      },
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
            ':focus': this.$coreOutline,
          };
        }
        return {
          color: this.$themeTokens.text,
          ':hover': {
            backgroundColor: this.$themeBrand.primary.v_50,
          },
          ':focus': this.$coreOutline,
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

  @import '~kolibri-design-system/lib/styles/definitions';

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

</style>
