<template>

  <div class="onboarding">
    <progress-toolbar
      @backButtonClicked="goToPreviousStep"
      :currentStep="onboardingStep"
      :totalSteps="totalOnboardingSteps"/>

    <component :is="currentOnboardingForm" class="onboarding-form"/>

  </div>

</template>


<script>

  import { provisionDevice, goToNextStep, goToPreviousStep } from '../state/actions';
  import progressToolbar from './progress-toolbar';
  import defaultLanguageForm from './setup-forms/default-language-form';
  import facilityNameForm from './setup-forms/facility-name-form';
  import superuserCredentialsForm from './setup-forms/superuser-credentials-form';
  import facilityPermissionsForm from './setup-forms/facility-permissions-form';

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
            return facilityPermissionForm;
          default:
            return null; // this is where we could do loading or error states?
        }
      },
    },
    vuex: {
      getters: {
        onboardingStep: state => state.onboardingStep,
      },
      actions: {
        goToPreviousStep,
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
