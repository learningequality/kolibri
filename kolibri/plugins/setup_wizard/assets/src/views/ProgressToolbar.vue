<template>

  <UiToolbar
    class="progress-toolbar"
    :style="{ backgroundColor: $themeTokens.appBar }"
    type="clear"
    textColor="white"
    :removeNavIcon="$attrs.removeNavIcon"
  >
    <template #icon>
      <KIconButton
        icon="back"
        :color="$themeTokens.textInverted"
        @click="$emit('click_back')"
      />
    </template>
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
        default: null,
      },
    },
  };

</script>
