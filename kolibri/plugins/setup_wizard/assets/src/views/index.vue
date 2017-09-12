<template>

  <div class="onboarding">

    <error-page v-if="error" />

    <loading-page v-else-if="loading" />

    <template v-else>
      <progress-toolbar
        @backButtonClicked="goToPreviousStep"
        :currentStep="onboardingStep"
        :totalSteps="totalOnboardingSteps"
        />

      <component
        :is="currentOnboardingForm"
        :submit-text="submitText"
        @submit="continueOnboarding"
        class="onboarding-form"
      />
    </template>

  </div>

</template>


<script>

  import { provisionDevice, goToNextStep, goToPreviousStep } from '../state/actions/main';

  import loadingPage from './submission-states/loading-page';
  import errorPage from './submission-states/error-page';

  import progressToolbar from './progress-toolbar';
  import defaultLanguageForm from './onboarding-forms/default-language-form';
  import facilityNameForm from './onboarding-forms/facility-name-form';
  import superuserCredentialsForm from './onboarding-forms/superuser-credentials-form';
  import facilityPermissionsForm from './onboarding-forms/facility-permissions-form';

  export default {
    name: 'onboarding',
    $trs: {
      onboardingNextStepButton: 'Continue',
      onboardingSubmitButton: 'Submit',
    },
    components: { progressToolbar, loadingPage, errorPage },
    data() {
      return {
        totalOnboardingSteps: 4,
      };
    },
    computed: {
      currentOnboardingForm() {
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
            return null;
        }
      },
      isLastStep() {
        return this.onboardingStep === this.totalOnboardingSteps;
      },
      submitText() {
        return this.isLastStep
          ? this.$tr('onboardingSubmitButton')
          : this.$tr('onboardingNextStepButton');
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
        loading: state => state.loading,
        error: state => state.error,
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
      max-width: 550px

</style>
