<template>

  <div class="onboarding">

    <ErrorPage
      v-if="error"
      class="body"
      :class="!windowIsLarge ? 'mobile' : ''"
    />

    <LoadingPage
      v-else-if="loading"
      class="body"
      :class="!windowIsLarge ? 'mobile' : ''"
    />

    <template v-else>
      <ProgressToolbar
        @backButtonClicked="goToPreviousStep"
        :currentStep="onboardingStep"
        :totalSteps="totalOnboardingSteps"
      />

      <component
        :is="currentOnboardingForm"
        :submitText="submitText"
        @submit="continueOnboarding"
        class="body"
        :class="!windowIsLarge ? 'mobile' : ''"
      />
    </template>

  </div>

</template>


<script>

  import { mapActions, mapState, mapMutations } from 'vuex';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import LoadingPage from './submission-states/LoadingPage';
  import ErrorPage from './submission-states/ErrorPage';
  import ProgressToolbar from './ProgressToolbar';
  import DefaultLanguageForm from './onboarding-forms/DefaultLanguageForm';
  // Use the full path until we can figure out why module resolution isn't working on Travis
  import SuperuserCredentialsForm from './onboarding-forms/SuperuserCredentialsForm.vue';
  import FacilityPermissionsForm from './onboarding-forms/FacilityPermissionsForm';
  import GuestAccessForm from './onboarding-forms/GuestAccessForm';
  import CreateLearnerAccountForm from './onboarding-forms/CreateLearnerAccountForm';
  import RequirePasswordForLearnersForm from './onboarding-forms/RequirePasswordForLearnersForm';

  export default {
    name: 'SetupWizardIndex',
    components: { ProgressToolbar, LoadingPage, ErrorPage },
    mixins: [responsiveWindow],
    $trs: {
      onboardingNextStepButton: 'Continue',
      onboardingFinishButton: 'Finish',
      documentTitle: 'Setup Wizard',
    },
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    data() {
      return {
        totalOnboardingSteps: 6,
      };
    },
    computed: {
      ...mapState(['onboardingStep', 'onboardingData', 'loading', 'error']),
      currentOnboardingForm() {
        switch (this.onboardingStep) {
          case 1:
            return DefaultLanguageForm;
          case 2:
            return FacilityPermissionsForm;
          case 3:
            return GuestAccessForm;
          case 4:
            return CreateLearnerAccountForm;
          case 5:
            return RequirePasswordForLearnersForm;
          case 6:
            return SuperuserCredentialsForm;
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
    },
    methods: {
      ...mapActions(['provisionDevice']),
      ...mapMutations({
        goToNextStep: 'INCREMENT_ONBOARDING_STEP',
        goToPreviousStep: 'DECREMENT_ONBOARDING_STEP',
      }),
      continueOnboarding() {
        if (this.isLastStep) {
          this.provisionDevice(this.onboardingData);
        } else {
          this.goToNextStep();
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .onboarding {
    @include clearfix(); // child margin leaks up into otherwise empty parent

    width: 100%;
  }

  .body {
    width: 90%;
    max-width: 550px;
    margin-top: 64px;
    margin-right: auto;
    margin-left: auto;
  }

  .mobile {
    margin-top: 40px;
  }

</style>
