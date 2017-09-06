<template>

  <div class="onboarding">
    <progress-toolbar
      @backButtonClicked="goToPreviousStep"
      :currentStep="onboardingStep"
      :totalSteps="totalOnboardingSteps"/>

    <component
      :is="currentOnboardingForm"
      :submit-text="submitText"
      @submit="continueOnboarding"
      class="onboarding-form"
    />

  </div>

</template>


<script>

  import { provisionDevice, goToNextStep, goToPreviousStep } from '../state/actions/main';
  import progressToolbar from './progress-toolbar';
  import defaultLanguageForm from './onboarding-forms/default-language-form';
  import facilityNameForm from './onboarding-forms/facility-name-form';
  import superuserCredentialsForm from './onboarding-forms/superuser-credentials-form';
  import facilityPermissionsForm from './onboarding-forms/facility-permissions-form';

  export default {
    name: 'Onboarding',
    components: { progressToolbar },
    data() {
      return {
        totalOnboardingSteps: 4,
      };
    },
    computed: {
      currentOnboardingForm() {
        // we don't need to register the components, as we're not using them in the template?
        switch (this.onboardingStep) {
          case 1:
            return defaultLanguageForm;
          case 2:
            return facilityNameForm;
          case 3:
            return superuserCredentialsForm;
          case 4:
            return facilityPermissionsForm;
          default:
            return null; // this is where we could do loading or error states?
        }
      },
      isLastStep() {
        return this.onboardingStep === this.totalOnboardingSteps;
      },
      submitText() {
        return this.isLastStep ? 'Submit' : 'Continue'; // TODO wrap
      },
    },
    methods: {
      continueOnboarding() {
        this.isLastStep ? this.provisionDevice(this.onboardingData) : this.goToNextStep();
      },
    },
    vuex: {
      getters: {
        onboardingStep: state => state.onboardingStep,
        onboardingData: state => state.onboardingData,
      },
      actions: {
        goToNextStep,
        goToPreviousStep,
        provisionDevice,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .onboarding
    &-form
      margin-top: 64px
      margin-left: auto
      margin-right: auto
      width: 90%
      max-width: 550px // as specified by Jessica

</style>
