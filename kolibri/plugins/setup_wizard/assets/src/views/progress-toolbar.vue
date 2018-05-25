<template>

  <ui-toolbar
    class="progress-toolbar"
    type="colored"
    textColor="white"
  >
    <ui-icon-button
      slot="icon"
      v-show="currentStep > 1"
      type="secondary"
      color="white"
      @click="$emit('backButtonClicked')"
      :class="{ 'rtl-icon': isRtl }"
    >
      <mat-svg name="arrow_back" category="navigation" />
    </ui-icon-button>
    {{ $tr('progressIndicator', {currentStep , totalSteps}) }}

  </ui-toolbar>

</template>


<script>

  import uiToolbar from 'keen-ui/src/UiToolbar';
  import uiIconButton from 'keen-ui/src/UiIconButton';

  export default {
    name: 'progressToolbar',
    components: {
      uiToolbar,
      uiIconButton,
    },
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

  .progress-toolbar
    fill: white

</style>
