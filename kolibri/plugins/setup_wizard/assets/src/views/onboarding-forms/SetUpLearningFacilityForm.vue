<template>

  <OnboardingStepBase
    :title="$tr('setUpFacilityTitle')"
    :description="$tr('setUpFacilityDescription')"
    @continue="handleContinue"
  >
    <KRadioButton
      v-model="selected"
      :label="$tr('createFacilityLabel')"
      :value="Options.NEW"
      class="radio-button"
    />
    <KRadioButton
      v-model="selected"
      :label="$tr('importFacilityLabel')"
      :value="Options.IMPORT"
      class="radio-button"
    />
  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';

  const Options = Object.freeze({
    IMPORT: 'IMPORT',
    NEW: 'NEW',
  });

  export default {
    name: 'SetUpLearningFacilityForm',
    components: {
      OnboardingStepBase,
    },
    inject: ['wizardService'],
    data() {
      return {
        Options,
        selected: Options.NEW,
      };
    },
    methods: {
      handleContinue() {
        console.log('handle continue:', this.selected);
        this.wizardService.send({ type: 'CONTINUE', value: this.selected });
      },
    },
    $trs: {
      setUpFacilityTitle: {
        message: 'Set up learning facility for this full device',
        context: '',
      },
      setUpFacilityDescription: {
        message:
          'Learning facility represents the location where you are installing Kolibri, such as a school, training center, or a home',
        context: '',
      },
      createFacilityLabel: {
        message: 'Create a new learning facility',
        context: '',
      },
      importFacilityLabel: {
        message: 'Import all data from an existing learning facility',
        context: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .radio-button {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

</style>
