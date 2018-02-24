<template>

  <div class="dib">
    <!-- Added because the trigger could not be a vue element smh-->
    <div
      ref="buttonContainer"
      class="button-container dib"
    >
      <k-button
        ref="button"
        :text="text"
        :appearance="appearance"
        :primary="primary"
        :disabled="disabled"
        :hasDropdown="true"
      />
    </div>

    <ui-popover
      ref="popover"
      trigger="buttonContainer"
      :containFocus="false"
      :position="position"
      @close="handleClose"
    >
      <ui-menu
        :options="options"
        @select="emitSelection"
      />
    </ui-popover>

  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import UiPopover from 'keen-ui/src/UiPopover';
  import uiMenu from 'keen-ui/src/UiMenu';

  export default {
    name: 'kDropdownMenu',
    components: {
      kButton,
      UiPopover,
      uiMenu,
    },
    props: {
      text: {
        type: String,
        required: true,
      },
      appearance: {
        type: String,
        required: false,
        default: 'raised-button',
      },
      primary: {
        type: Boolean,
        required: false,
        default: false,
      },
      disabled: {
        type: Boolean,
        required: false,
        default: false,
      },
      options: {
        type: Array,
        required: true,
      },
      position: {
        type: String,
        required: false,
        default: 'bottom right',
      },
    },
    methods: {
      emitSelection(selection) {
        this.$emit('select', selection);
        this.$refs.popover.close();
      },
      handleClose() {
        this.$refs.button.$el.focus();
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .dib
    display: inline-block

  .button-container
    >>>.button
      margin: 0

</style>
