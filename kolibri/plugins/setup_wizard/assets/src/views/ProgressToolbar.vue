<template>

  <UiToolbar
    class="progress-toolbar"
    :style="{ backgroundColor: $themeTokens.appBar }"
    type="clear"
    textColor="white"
    :removeNavIcon="$attrs.removeNavIcon"
  >
    <KIconButton
      slot="icon"
      icon="back"
      color="white"
      :class="{ 'rtl-icon': isRtl }"
      @click="$emit('click_back')"
    >
      <KIcon
        icon="back"
        :color="$themeTokens.textInverted"
        style="top: 0; width: 24px; height: 24px;"
      />
    </UiIconButton>

    <span>
      {{ title || coreString('kolibriLabel') }}
    </span>
  </UiToolbar>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';

  export default {
    name: 'ProgressToolbar',
    components: {
      UiToolbar,
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
