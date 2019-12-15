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
        :currentStep="onboardingStep"
        :totalSteps="totalOnboardingSteps"
        :style="{ backgroundColor: $themeTokens.appBar }"
        @backButtonClicked="goToPreviousStep"
      />

      <div class="page-wrapper">
        <KPageContainer class="page-container">
          <component
            :is="currentOnboardingForm"
            :submitText="submitText"
            :class="!windowIsLarge ? 'mobile' : ''"
            @submit="continueOnboarding"
          />
        </KPageContainer>
      </div>
    </template>

  </div>

</template>


<script>

  import { mapActions, mapState, mapMutations } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
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
  import PersonalDataConsentForm from './onboarding-forms/PersonalDataConsentForm';

  const stepToOnboardingFormMap = {
    1: DefaultLanguageForm,
    2: FacilityPermissionsForm,
    3: GuestAccessForm,
    4: CreateLearnerAccountForm,
    5: RequirePasswordForLearnersForm,
    6: SuperuserCredentialsForm,
    7: PersonalDataConsentForm,
  };

  export default {
    name: 'SetupWizardIndex',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ProgressToolbar,
      LoadingPage,
      ErrorPage,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        totalOnboardingSteps: 7,
      };
    },
    computed: {
      ...mapState(['onboardingStep', 'onboardingData', 'loading', 'error']),
      currentOnboardingForm() {
        return stepToOnboardingFormMap[this.onboardingStep] || null;
      },
      isLastStep() {
        return this.onboardingStep === this.totalOnboardingSteps;
      },
      submitText() {
        return this.isLastStep
          ? this.coreString('finishAction')
          : this.coreString('continueAction');
      },
    },
    methods: {
      ...mapActions(['provisionDevice']),
      ...mapMutations({
        goToNextStep: 'INCREMENT_ONBOARDING_STEP',
        goToPreviousStep: 'DECREMENT_ONBOARDING_STEP',
      }),
      goToPreviousStep() {
        // Clear password if going backwards from SuperUserCredentialsForm or
        // PersonalDataConsentForm
        if (this.onboardingStep === 6 || this.onboardingStep === 7) {
          this.$store.commit('CLEAR_PASSWORD');
        }
        this.$store.commit('DECREMENT_ONBOARDING_STEP');
      },
      continueOnboarding() {
        if (this.isLastStep) {
          if (this.onboardingData.preset === 'informal') {
            this.provisionDevice({
              ...this.onboardingData,
              facility: {
                name: this.$tr('personalFacilityName', {
                  name: this.onboardingData.superuser.full_name,
                }),
              },
            });
          } else {
            this.provisionDevice(this.onboardingData);
          }
        } else {
          this.goToNextStep();
        }
      },
    },
    $trs: {
      documentTitle: 'Setup Wizard',
      personalFacilityName: 'Home Facility {name}',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  // from http://nicolasgallagher.com/micro-clearfix-hack/
  @mixin clearfix() {
    zoom: 1;
    &::after,
    &::before {
      display: table;
      content: '';
    }
    &::after {
      clear: both;
    }
  }

  .onboarding {
    @include clearfix(); // child margin leaks up into otherwise empty parent

    width: 100%;
  }

  .body {
    width: 90%;
    max-width: 550px;
    margin-top: 64px;
    margin-right: auto;
    margin-bottom: 32px;
    margin-left: auto;
  }

  .page-wrapper {
    padding: 8px;
  }

  .page-container {
    max-width: 650px;
    padding: 36px;
    margin: auto;
  }

  .mobile {
    margin-top: 40px;
    margin-bottom: 24px;
  }

</style>
