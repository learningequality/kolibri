<template>

  <span>
    <span v-if="windowSize.breakpoint > 2 || !icon">
      <ui-button
        :disabled="disabled"
        :ariaLabel="name"
        :type="type"
        :color="color"
        :icon="icon"
        :hasDropdown="true"
        :class="{ appbarbutton: inAppBar }"
        ref="buttonLarge">
        {{ name }}
        <ui-menu
          :options="options"
          slot="dropdown"
          class="dropdown-menu"
          :class="{ disabledasselected: displayDisabledAsSelected }"
          @close="$refs.buttonLarge.closeDropdown()"
          @select="emitSelection" />
      </ui-button>
    </span>
    <span v-else>
      <ui-icon-button
        :disabled="disabled"
        :ariaLabel="name"
        :type="type"
        :color="color"
        :icon="icon"
        :hasDropdown="true"
        ref="button">
        <ui-menu
          :options="options"
          slot="dropdown"
          class="dropdown-menu"
          :class="{ disabledasselected: displayDisabledAsSelected }"
          @close="$refs.button.closeDropdown()"
          @select="emitSelection" />
      </ui-icon-button>
    </span>
  </span>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import uiButton from 'keen-ui/src/UiButton';
  import uiIconButton from 'keen-ui/src/UiIconButton';
  import uiMenu from 'keen-ui/src/UiMenu';
  export default {
    components: {
      uiButton,
      uiIconButton,
      uiMenu,
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
        default: 'primary',
      },
      inAppBar: {
        type: Boolean,
        default: false,
      },
      displayDisabledAsSelected: {
        type: Boolean,
        default: false,
      },
      disabled: {
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
