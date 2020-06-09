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

      <div
        v-if="containFocus"
        class="ui-menu-focus-redirector"
        tabindex="0"
        @focus="handleFirstTrapFocus"
      >
      </div>

      <slot name="options"></slot>

      <div
        v-if="containFocus"
        class="ui-menu-focus-redirector"
        tabindex="0"
        @focus="handleLastTrapFocus"
      >
      </div>
    </ul>
  </div>

</template>


<script>

  import last from 'lodash/last';

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
      isOpen: {
        type: Boolean,
        default: false,
      },
    },
    provide() {
      return {
        showActive: this.showActive,
      };
    },
    data() {
      return {
        containTopFocus: false,
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

    watch: {
      isOpen(val) {
        if (val === false) {
          this.containTopFocus = false;
        }
      },
    },
    methods: {
      focusFirstOption() {
        this.$el.querySelector('.core-menu-option').focus();
      },
      focusLastOption() {
        const lastOption = last(this.$el.querySelectorAll('.core-menu-option'));
        if (lastOption) {
          lastOption.focus();
        }
      },
      handleFirstTrapFocus(e) {
        e.stopPropagation();
        if (!this.containTopFocus) {
          // On first focus, redirect to first option, then activate trap
          this.focusFirstOption();
          this.containTopFocus = true;
        } else {
          this.focusLastOption();
        }
      },
      handleLastTrapFocus(e) {
        e.stopPropagation();
        this.focusFirstOption();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';
  .ui-menu-header {
    padding: 1rem 1rem 1rem 50px;
    font-size: 0.9375rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

</style>
