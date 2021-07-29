<template>

  <div>
    <OnboardingForm
      :header="$tr('learningEnvironmentHeader')"
      :description="$tr('facilityPermissionsSetupFormDescription')"
      @submit="handleSubmit"
    >
      <FacilityNameTextbox ref="facility-name" />

      <KRadioButton
        ref="first-button"
        v-model="selected"
        class="permission-preset-radio-button"
        :value="Presets.NONFORMAL"
        :label="$tr('nonFormalLabel')"
        :description="$tr('nonFormalDescription')"
      />

      <KRadioButton
        v-model="selected"
        class="permission-preset-radio-button"
        :value="Presets.FORMAL"
        :label="$tr('formalLabel')"
        :description="$tr('formalDescription')"
      />
    </OnboardingForm>
  </div>

</template>


<script>

  import { Presets } from '../../constants';
  import OnboardingForm from './OnboardingForm';
  import FacilityNameTextbox from './FacilityNameTextbox';

  export default {
    name: 'FacilityPermissionsForm',
    components: {
      FacilityNameTextbox,
      OnboardingForm,
    },
    data() {
      return {
        selected: this.$store.state.onboardingData.preset || Presets.NONFORMAL,
        Presets,
      };
    },
    computed: {
      formalIsSelected() {
        return this.selected === Presets.FORMAL;
      },
      nonformalIsSelected() {
        return this.selected === Presets.NONFORMAL;
      },
      submittedFacilityName() {
        if (this.nonformalIsSelected || this.formalIsSelected) {
          return this.$refs['facility-name'].facilityName;
        } else {
          // Will be turned into a default "Home Facility {{ full name }}" after it is provided
          // in SuperuserCredentialsForm
          return '';
        }
      },
      formIsValid() {
        return !this.$refs['facility-name'].facilityNameIsInvalid;
      },
    },
    mounted() {
      this.focusOnTextbox();
    },
    methods: {
      focusOnTextbox() {
        return this.$refs['facility-name'].focus();
      },
      handleSubmit() {
        this.$refs['facility-name'].validateFacilityName();
        if (this.formIsValid) {
          this.$store.commit('SET_FACILITY_NAME', this.submittedFacilityName);

          // Pre-select defaults for the next 3 Yes/No sections
          if (this.formalIsSelected) {
            this.$store.dispatch('setFormalUsageDefaults');
          } else {
            this.$store.dispatch('setNonformalUsageDefaults');
          }
          this.$emit('click_next');
        } else {
          this.focusOnTextbox();
        }
      },
    },
    $trs: {
      learningEnvironmentHeader: {
        message: 'What kind of learning environment is your facility?',
        context: 'Page title',
      },
      facilityPermissionsSetupFormDescription: {
        message:
          'A facility is the location where you are installing Kolibri, such as a school, training center, or a home.',
        context:
          'Description of a facility which the admin sees to help them decide what type of facility they should create.',
      },
      formalLabel: {
        message: 'Formal',
        context: 'Label for the radio button option in the facility setup',
      },
      formalDescription: {
        message: 'Schools and other formal learning contexts',
        context: 'Option description text',
      },
      nonFormalLabel: {
        message: 'Non-formal',
        context: 'Label for the radio button option in the facility setup',
      },
      nonFormalDescription: {
        message:
          'Libraries, orphanages, correctional facilities, youth centers, computer labs, and other non-formal learning contexts',

        context: 'Option description text',
      },
    },
    //
  };

</script>


<style lang="scss" scoped>

  $margin-of-radio-button-text: 32px;

  .permission-preset {
    cursor: pointer;
  }

  .permission-preset-modal-dismiss-button {
    text-transform: uppercase;
  }

  .permission-preset-human {
    margin-bottom: 8px;
  }

  .permission-preset-human-title {
    font-weight: bold;
  }

  .permission-preset-human-detail {
    display: list-item;
    margin-left: 20px;
    line-height: 1.4em;
  }

</style>
