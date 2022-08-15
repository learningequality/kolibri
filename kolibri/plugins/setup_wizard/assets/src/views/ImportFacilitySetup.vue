<template>

  <component
    :is="currentComponent"
    :device.sync="device"
    :facility.sync="facility"
    :superuser.sync="superuser"
    :stepMessage.sync="currentStepMessage"
    @click_back="goToLastStep"
    @click_next="goToNextStep"
  />

</template>


<script>

  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import ProgressToolbar from './ProgressToolbar';
  import OnboardingStepBase from './OnboardingStepBase';
  import PersonalDataConsentForm from './onboarding-forms/PersonalDataConsentForm';
  import ImportAuthentication from './importFacility/ImportAuthentication';
  import SelectFacilityForm from './importFacility/SelectFacilityForm';
  import SelectSuperAdminAccountForm from './importFacility/SelectSuperAdminAccountForm';
  import LoadingTaskPage from './importFacility/LoadingTaskPage';

  const stepToComponentMap = {
    1: SelectFacilityForm,
    2: ImportAuthentication,
    3: LoadingTaskPage,
    4: SelectSuperAdminAccountForm,
    5: PersonalDataConsentForm,
  };

  const TOTAL_STEPS = 4;

  // Template for the 'Import Facility' workflow, which manages the title
  // and back/forth flow for this group of steps.
  export default {
    name: 'ImportFacilitySetup',
    components: {
      OnboardingStepBase,
      PersonalDataConsentForm,
      ProgressToolbar,
    },
    mixins: [commonSyncElements],
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
    inject: ['wizardService'],
    computed: {
      currentComponent() {
        const { step } = this.$route.params;
        return stepToComponentMap[step];
      },
      currentStep() {
        return Number(this.$route.params.step);
      },
      currentStepMessage() {
        return this.$tr('stepTitle', {
          step: this.currentStep,
          total: TOTAL_STEPS,
        });
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
      goToNextStep({ device, facility } = {}) {
        this.device = device || this.device;
        this.facility = facility || this.facility;

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
          this.wizardService.send('BACK');
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
        context:
          'Title that goes on top of the screen to indicate the current step in the import facility process.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
