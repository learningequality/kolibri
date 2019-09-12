<template>

  <div @keydown.esc="$emit('close')">
    <ul
      role="menu"
      class="ui-menu"
      :class="classes"
    >
      <!-- if anything in the dropdown menu has an icon, then we are
      going to add padding to make all the items align -->
      <div
        v-if="$slots.header"
        class="ui-menu-header"
        :style="{ color: $themeTokens.text }"
      >
        <slot name="header"></slot>
      </div>

      <slot name="options"></slot>

      <div
        v-if="containFocus"
        class="ui-menu-focus-redirector"
        tabindex="0"
        @focus="redirectFocus"
      >
      </div>
    </ul>
  </div>

</template>


<script>

  export default {
    name: 'CoreMenu',
    props: {
      // Whether to show if links are currently active
      showActive: {
        type: Boolean,
        default: true,
      },
      hasSecondaryText: {
        type: Boolean,
        default: false,
      },
      containFocus: {
        type: Boolean,
        default: false,
      },
      raised: {
        type: Boolean,
        default: false,
      },
    },
    provide() {
      return {
        showActive: this.showActive,
      };
    },
    computed: {
      classes() {
        return {
          'is-raised': this.raised,
          'has-secondary-text': this.hasSecondaryText,
        };
      },
    },

    methods: {
      redirectFocus(e) {
        e.stopPropagation();
        this.$el.querySelector('.core-menu-option').focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';
  .ui-menu-header {
    padding: 1rem 1rem 1rem 50px;
    font-size: 0.9375rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

</style>
