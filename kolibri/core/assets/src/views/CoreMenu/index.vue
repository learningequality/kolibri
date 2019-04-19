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
        :class="{'ui-menu-header-lp': hasIcons}"
        :style="{ color: $coreTextDefault }"
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

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'CoreMenu',
    mixins: [themeMixin],
    props: {
      hasIcons: {
        type: Boolean,
        default: false,
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

    computed: {
      classes() {
        return {
          'is-raised': this.raised,
          'has-icons': this.hasIcons,
          'has-secondary-text': this.hasSecondaryText,
        };
      },
    },

    methods: {
      selectOption(option) {
        if (option.disabled || option.type === 'divider') {
          return;
        }
        this.$emit('select', option);
        this.closeMenu();
      },

      closeMenu() {
        this.$emit('close');
      },

      redirectFocus(e) {
        e.stopPropagation();
        this.$el.querySelector('.ui-menu-option').focus();
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~keen-ui/src/styles/imports';
  @import '~kolibri.styles.definitions';

  /* stylelint-disable csstree/validator */

  .ui-menu {
    min-width: rem-calc(168px);
    max-width: rem-calc(272px);
    max-height: 100vh;
    padding: rem-calc(4px 0);
    margin: 0;
    overflow-x: hidden;
    overflow-y: auto;
    list-style: none;
    background-color: inherit;
    border: rem-calc(1px) solid rgba(black, 0.08);
    outline: none;

    &.is-raised {
      @extend %dropshadow-8dp;

      border: 0;
    }

    &.has-secondary-text {
      min-width: rem-calc(240px);
      max-width: rem-calc(304px);
    }
  }

  .ui-menu-focus-redirector {
    position: absolute;
    opacity: 0;
  }

  .ui-menu-header {
    padding: 1rem;
    font-size: $ui-dropdown-item-font-size;
    border-bottom: solid 1px rgba(black, 0.08);
  }

  .ui-menu-header-lp {
    padding-left: 50px; // TODO make a variable?
  }

  /* stylelint-enable */

</style>
