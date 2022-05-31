<template>

  <OnboardingStepBase
    :title="$tr('setUpFacilityTitle')"
    :description="$tr('setUpFacilityDescription')"
    @submit="handleSubmit"
  >
    <KRadioButton
      v-model="selected"
      :label="$tr('createFacilityLabel')"
      value="CREATE"
      class="radio-button"
    />
    <KRadioButton
      v-model="selected"
      :label="$tr('importFacilityLabel')"
      value="IMPORT"
      class="radio-button"
    />
  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'SetUpLearningFacilityForm',
    components: {
      OnboardingStepBase,
    },

    data() {
      return {
        selected: '',
      };
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
