<template>

  <div>
    <ProgressToolbar
      :removeNavIcon="removeNavIcon"
      :title="currentTitle"
      @click_back="goToLastStep"
    />
    <div class="main">
      <KPageContainer>
        <component
          :is="currentComponent"
          :device.sync="device"
          :facility.sync="facility"
          :superuser.sync="superuser"
          @click_next="goToNextStep"
        />
      </KPageContainer>
    </div>
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
      // Global state for the import process
      return {
        // Peer device
        device: {
          name: '',
          id: '',
          baseurl: '',
        },
        // Facility info and credentials
        facility: {
          name: '',
          id: '',
          username: '',
          password: '',
        },
        // Superuser credentials
        superuser: {
          username: '',
          password: '',
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
    beforeRouteUpdate(to, from, next) {
      // If trying to go backwards, prevent navigation and move the history back
      // to previous location
      if (Number(from.params.step) >= 2 && Number(to.params.step <= 2)) {
        window.history.forward();
        return;
      } else {
        next();
      }
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
        this.$store.dispatch('provisionDeviceAfterImport', {
          username: this.superuser.username,
          password: this.superuser.password,
          facility: this.facility.id,
        });
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


<style lang="scss" scoped>

  .main {
    margin: 16px;
  }

</style>
