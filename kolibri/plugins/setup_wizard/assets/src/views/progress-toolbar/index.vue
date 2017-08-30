<template>

  <ui-toolbar
    class="progress-toolbar"
    navIcon="arrow_back"
    :removeNavIcon="currentStep <= 1"
    @nav-icon-click="$emit('backButtonClicked')"
    type="colored"
    textColor="white">

    {{ $tr('progressIndicator', {currentStep , totalSteps}) }}

  </ui-toolbar>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';

  export default {
    name: 'progressToolbar',
    components: { uiToolbar },
    $trs: {
      progressIndicator: 'Step {currentStep, number} of {totalSteps, number}',
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
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

</style>