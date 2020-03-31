<template>

  <UiToolbar
    class="progress-toolbar"
    type="clear"
    textColor="white"
    :removeNavIcon="!displayNavIcon"
  >
    <KIconButton
      slot="icon"
      icon="back"
      color="white"
      @click="$emit('backButtonClicked')"
    />
    {{ $tr('progressIndicator', { currentStep , totalSteps }) }}

  </UiToolbar>

</template>


<script>

  import UiToolbar from 'kolibri.coreVue.components.UiToolbar';

  export default {
    name: 'ProgressToolbar',
    components: {
      UiToolbar,
    },
    props: {
      currentStep: {
        type: Number,
        required: true,
      },
      totalSteps: {
        type: Number,
        required: true,
      },
    },
    computed: {
      displayNavIcon() {
        return this.currentStep > 1;
      },
    },
    $trs: {
      progressIndicator: 'Step {currentStep, number} of {totalSteps, number}',
    },
  };

</script>


<style lang="scss" scoped>

  // TODO - refactor to use theme
  .progress-toolbar {
    fill: white;
  }

</style>
