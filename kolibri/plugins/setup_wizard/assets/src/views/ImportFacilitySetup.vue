<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="removeNavIcon"
      :title="currentTitle"
      @click_back="goToLastStep"
    />
    <KPageContainer>
      <component
        :is="currentComponent"
        v-bind="{ ...setupData }"
        @click_next="goToNextStep"
      />
    </KPageContainer>
  </div>

</template>


<script>

  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import commonSetupElements from '../../../commonSetupElements';
  import ProgressToolbar from './ProgressToolbar';
  import OnboardingForm from './onboarding-forms/OnboardingForm';
  import PersonalDataConsentForm from './onboarding-forms/PersonalDataConsentForm';
  import SelectFacilityForm from './importFacility/SelectFacilityForm';
  import SelectSuperAdminAccountForm from './importFacility/SelectSuperAdminAccountForm';
  import LoadingTaskPage from './importFacility/LoadingTaskPage';

  const stepToComponentMap = {
    1: SelectFacilityForm,
    2: LoadingTaskPage,
    3: SelectSuperAdminAccountForm,
    4: PersonalDataConsentForm,
  };

  const TOTAL_STEPS = 4;

  const fakeFacilities = [
    {
      id: 'D81C',
      name: 'Atkinson Hall',
    },
    {
      id: '2A59',
      name: 'Price Center',
    },
  ];

  // Template for the 'Import Facility' workflow, which manages the title
  // and back/forth flow for this group of steps.
  export default {
    name: 'ImportFacilitySetup',
    components: {
      OnboardingForm,
      PersonalDataConsentForm,
      ProgressToolbar,
    },
    mixins: [commonSetupElements, commonSyncElements],
    data() {
      return {
        setupData: {
          device: {
            name: 'LINUX 3',
            address: 'localhost:8008',
            id: 'EE31',
          },
          // All facilities
          facilities: fakeFacilities,
          // Facility chosen at 2 SelectFacilityForm
          facility: {
            ...fakeFacilities[0],
          },
        },
      };
    },
    computed: {
      currentComponent() {
        const { step } = this.$route.params;
        return stepToComponentMap[step];
      },
      currentStep() {
        return Number(this.$route.params.step);
      },
      currentTitle() {
        return this.$tr('stepTitle', {
          step: this.currentStep,
          total: TOTAL_STEPS,
        });
      },
      removeNavIcon() {
        // TODO disable backwards navigation at the router level
        return this.currentStep > 1;
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
        // DELETE
        this.$store.commit('SET_FACILITY_PRESET', 'informal');
        this.$store.dispatch('provisionDevice');
      },
    },
    $trs: {
      stepTitle: {
        message: 'Import facility - {step, number} of {total, number}',
        context: 'Title that goes on top of the screen to indicate the current step',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
