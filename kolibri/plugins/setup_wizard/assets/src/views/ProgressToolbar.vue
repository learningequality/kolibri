<template>

  <UiToolbar
    class="progress-toolbar"
    :style="{ backgroundColor: $themeTokens.appBar }"
    type="clear"
    textColor="white"
    :removeNavIcon="$attrs.removeNavIcon"
  >
    <UiIconButton
      slot="icon"
      type="secondary"
      color="white"
      :class="{ 'rtl-icon': isRtl }"
      @click="$emit('click_back')"
    >
      <mat-svg name="arrow_back" category="navigation" />
    </UiIconButton>

    <span>
      {{ title || coreString('kolibriLabel') }}
    </span>
  </UiToolbar>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';

  export default {
    name: 'ProgressToolbar',
    components: {
      UiToolbar,
      UiIconButton,
    },
    mixins: [commonCoreStrings],
    props: {
      title: {
        type: String,
        required: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  // TODO - refactor to use theme
  .progress-toolbar {
    fill: white;
  }

</style>
