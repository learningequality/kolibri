<template>

  <div>
    <OnboardingForm
      :header="$tr('facilityPermissionsSetupFormHeader')"
      :description="$tr('facilityPermissionsSetupFormDescription')"
      :submitText="submitText"
      @submit="setPermissions"
    >
      <KRadioButton
        ref="first-button"
        class="permission-preset-radio-button"
        v-model="selectedPreset"
        value="nonformal"
        :label="$tr('selfManagedSetupTitle')"
        :description="$tr('selfManagedSetupDescription')"
      />
      <FacilityNameForm
        ref="facility-name-nonformal"
        class="facility-name-form"
        v-show="selectedPreset=='nonformal'"
      />

      <KRadioButton
        class="permission-preset-radio-button"
        v-model="selectedPreset"
        value="formal"
        :label="$tr('adminManagedSetupTitle')"
        :description="$tr('adminManagedSetupDescription')"
      />
      <FacilityNameForm
        ref="facility-name-formal"
        class="facility-name-form"
        v-show="selectedPreset=='formal'"
      />

      <KRadioButton
        class="permission-preset-radio-button"
        v-model="selectedPreset"
        value="informal"
        :label="$tr('informalSetupTitle')"
        :description="$tr('informalSetupDescription')"
      />
    </OnboardingForm>
  </div>

</template>


<script>

  import { mapMutations } from 'vuex';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import OnboardingForm from './OnboardingForm';
  import FacilityNameForm from './FacilityNameForm';

  export default {
    name: 'FacilityPermissionsForm',
    components: {
      FacilityNameForm,
      OnboardingForm,
      KRadioButton,
      KButton,
      KTextbox,
    },
    $trs: {
      facilityPermissionsSetupFormHeader: 'Choose a Facility setup',
      facilityPermissionsSetupFormDescription:
        'How will you be using Kolibri? (You can customize these settings later)',
      facilityPermissionsPresetDetailsLink: 'More information about these settings',
      adminManagedSetupTitle: 'Formal',
      adminManagedSetupDescription: 'Schools and other formal learning contexts',
      selfManagedSetupTitle: 'Non-formal',
      selfManagedSetupDescription:
        'Libraries, orphanages, correctional facilities, youth centers, computer labs, and other non-formal learning contexts',
      informalSetupTitle: 'Personal',
      informalSetupDescription:
        'Homeschooling, supplementary individual learning, and other informal use',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        selectedPreset: this.$store.state.onboardingData.preset,
        permissionPresetDetailsModalShown: false,
        facilityNameText: '',
      };
    },
    computed: {
      submittedFacilityName() {
        if (this.selectedPreset === 'nonformal') {
          return this.submitFacilityName(this.$refs['facility-name-nonformal'].facilityName);
        } else if (this.selectedPreset === 'formal') {
          return this.submitFacilityName(this.$refs['facility-name-formal'].facilityName);
        } else {
          // Will be turned into a default "Home Facility {{ full name }}" after it is provided
          // in SuperuserCredentialsForm
          return '';
        }
      },
    },
    watch: {
      selectedPreset() {
        return this.$nextTick().then(() => {
          this.focusOnTextbox();
        });
      },
    },
    mounted() {
      this.focusOnTextbox();
    },
    methods: {
      ...mapMutations({
        submitFacilityPermissions: 'SET_FACILITY_PRESET',
        submitFacilityName: 'SET_FACILITY_NAME',
      }),
      focusOnTextbox() {
        if (this.selectedPreset === 'nonformal') {
          return this.$refs['facility-name-nonformal'].$refs['facilityName'].focus();
        } else if (this.selectedPreset === 'formal') {
          return this.$refs['facility-name-formal'].$refs['facilityName'].focus();
        }
      },
      setPermissions() {
        this.submitFacilityPermissions(this.selectedPreset);
        this.submitFacilityName(this.submittedFacilityName);
        this.$emit('submit');
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  $margin-of-radio-button-text: 32px;

  .facility-name-form {
    margin-left: 32px;
  }

  .permission-preset {
    cursor: pointer;

    &-modal {
      &-dismiss-button {
        text-transform: uppercase;
      }
    }
  }

  .permission-preset-human {
    margin-bottom: 8px;
    &-title {
      font-weight: bold;
    }
    &-detail {
      display: list-item;
      margin-left: 20px;
      line-height: 1.4em;
    }
  }

</style>
