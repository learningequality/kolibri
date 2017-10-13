<template>

  <span>
    <span v-if="inAppBar && windowSize.breakpoint > 1 || !inAppBar && windowSize.breakpoint > 0 ">
      <ui-button
        :ariaLabel="name"
        :type="type"
        :color="color"
        :icon="icon"
        :has-dropdown="true"
        :class="{ appbarbutton: inAppBar }"
        ref="buttonLarge">
        {{ name }}
        <ui-menu
          :options="options"
          slot="dropdown"
          class="dropdown-menu"
          :class="{ disabledasselected: displayDisabledAsSelected }"
          @close="$refs.buttonLarge.closeDropdown()"
          @select="emitSelection"/>
      </ui-button>
    </span>
    <span v-else>
      <ui-icon-button
        :ariaLabel="name"
        :type="type"
        :color="color"
        :icon="icon"
        :has-dropdown="true"
        ref="button">
        <ui-menu
          :options="options"
          slot="dropdown"
          class="dropdown-menu"
          :class="{ disabledasselected: displayDisabledAsSelected }"
          @close="$refs.button.closeDropdown()"
          @select="emitSelection"/>
      </ui-icon-button>
    </span>
  </span>

</template>


<script>

  const responsiveWindow = require('kolibri.coreVue.mixins.responsiveWindow');

  module.exports = {
    components: {
      'ui-button': require('keen-ui/src/UiButton'),
      'ui-icon-button': require('keen-ui/src/UiIconButton'),
      'ui-menu': require('keen-ui/src/UiMenu'),
    },
    mixins: [responsiveWindow],
    props: {
      name: {
        type: String,
        required: true,
      },
      options: {
        type: Array,
        required: true,
      },
      icon: {
        type: String,
        default: '',
      },
      type: {
        type: String,
        default: 'secondary',
      },
      color: {
        type: String,
        default: 'primary'
      },
      inAppBar: {
        type: Boolean,
        default: false,
      },
      displayDisabledAsSelected: {
        type: Boolean,
        default: false,
      },
    },
    methods: {
      emitSelection(selection) {
        this.$emit('select', selection);
      },
    },
  };

</script>


<style lang="stylus" scoped>

  span
    display: inline-block

</style>


<style lang="stylus">

  @require '~kolibri.styles.definitions'

  .dropdown-menu
    &.ui-menu
      max-width: 210px

    &.disabledasselected
      .ui-menu-option
        &.is-disabled
          color: $core-accent-color
          font-weight: bold
          opacity: 1
          background-color: rgba(0, 0, 0, 0.05)

</style>
