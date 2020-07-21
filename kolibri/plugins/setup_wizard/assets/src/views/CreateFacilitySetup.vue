<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="false"
      :title="currentTitle"
      @click_back="goToLastStep"
    />
    <div class="main">
      <KPageContainer>
        <component :is="currentComponent" @click_next="goToNextStep" />
      </KPageContainer>
    </div>
  </div>

</template>


<script>

  import commonSetupElements from '../../../commonSetupElements';
  import FacilityPermissionsForm from './onboarding-forms/FacilityPermissionsForm';
  import GuestAccessForm from './onboarding-forms/GuestAccessForm';
  import CreateLearnerAccountForm from './onboarding-forms/CreateLearnerAccountForm';
  import RequirePasswordForLearnersForm from './onboarding-forms/RequirePasswordForLearnersForm';
  import PersonalDataConsentForm from './onboarding-forms/PersonalDataConsentForm';
  import SuperuserCredentialsForm from './onboarding-forms/SuperuserCredentialsForm';
  import ProgressToolbar from './ProgressToolbar';

  const stepToComponentMap = {
    1: FacilityPermissionsForm,
    2: GuestAccessForm,
    3: CreateLearnerAccountForm,
    4: RequirePasswordForLearnersForm,
    5: SuperuserCredentialsForm,
    6: PersonalDataConsentForm,
  };

  const TOTAL_STEPS = 6;

  // Template for the 'New Facility' workflow, which manages the title
  // and back/forth flow for this group of steps
  export default {
    name: 'CreateFacilitySetup',
    components: {
      ProgressToolbar,
    },
    mixins: [commonSetupElements],
    computed: {
      currentComponent() {
        const { step } = this.$route.params;
        return stepToComponentMap[step];
      },
      currentStep() {
        return Number(this.$route.params.step);
      },
      currentTitle() {
        return this.$tr('newFacilityStepTitle', {
          step: this.currentStep,
          total: TOTAL_STEPS,
        });
      },
    },
    methods: {
      goToNextStep() {
        if (this.currentStep < TOTAL_STEPS) {
          this.$router.push({
            params: {
              step: this.currentStep + 1,
            },
          });
        } else if (this.currentStep === TOTAL_STEPS) {
          this.finalizeOnboardingData();
        }
      },
      goToLastStep() {
        if (this.currentStep > 1) {
          this.$router.push({
            params: {
              step: this.currentStep - 1,
            },
          });
        } else if (this.currentStep === 1) {
          this.goToSetupMethodPage();
        }
      },
      finalizeOnboardingData() {
        this.$store.dispatch('provisionDevice');
      },
    },
    $trs: {
      newFacilityStepTitle: {
        message: 'New facility - step {step, number} of {total, number}',
        context: 'Title that goes on top of the screen to indicate the current step',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .main {
    margin: 16px;
  }

</style>
