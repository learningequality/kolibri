<template>

  <div class="onboarding">

    <error-page
      v-if="error"
      :class="['onboarding-body', (isMobile ? 'mobile' : '')]"
    />

    <loading-page
      v-else-if="loading"
      :class="['onboarding-body', (isMobile ? 'mobile' : '')]"
    />

    <template v-else>
      <progress-toolbar
        @backButtonClicked="goToPreviousStep"
        :currentStep="onboardingStep"
        :totalSteps="totalOnboardingSteps"
      />

      <component
        :is="currentOnboardingForm"
        :submitText="submitText"
        :isMobile="isMobile"
        @submit="continueOnboarding"
        :class="['onboarding-body', (isMobile ? 'mobile' : '')]"
      />
    </template>

  </div>

</template>


<script>

  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
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
    components: { progressToolbar, loadingPage, errorPage },
    mixins: [responsiveWindow],
    $trs: {
      onboardingNextStepButton: 'Continue',
      onboardingFinishButton: 'Finish',
    },
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
            return facilityPermissionsForm;
          case 4:
            return superuserCredentialsForm;
          default:
            return null;
        }
      },
      isLastStep() {
        return this.onboardingStep === this.totalOnboardingSteps;
      },
      submitText() {
        return this.isLastStep
          ? this.$tr('onboardingFinishButton')
          : this.$tr('onboardingNextStepButton');
      },
      isMobile() {
        return this.windowSize.breakpoint < 4;
      },
    },
    methods: {
      continueOnboarding() {
        if (this.isLastStep) {
          this.provisionDevice(this.onboardingData);
        } else {
          this.goToNextStep();
        }
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
    width: 100%
    clearfix() // child margin leaks up into otherwise empty parent
    &-body
      margin-top: 64px
      margin-left: auto
      margin-right: auto
      width: 90%
      max-width: 550px
      &.mobile
        margin: 40px auto

</style>
