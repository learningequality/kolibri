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

      <KRadioButton
        class="permission-preset-radio-button"
        v-model="selectedPreset"
        value="formal"
        :label="$tr('adminManagedSetupTitle')"
        :description="$tr('adminManagedSetupDescription')"
      />

      <KRadioButton
        class="permission-preset-radio-button"
        v-model="selectedPreset"
        value="informal"
        :label="$tr('informalSetupTitle')"
        :description="$tr('informalSetupDescription')"
      />

      <KButton
        slot="footer"
        appearance="basic-link"
        :text="$tr('facilityPermissionsPresetDetailsLink')"
        @click="showFacilityPermissionsDetails"
      />
    </OnboardingForm>
  </div>

</template>


<script>

  import { mapMutations } from 'vuex';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import KButton from 'kolibri.coreVue.components.KButton';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'FacilityPermissionsForm',
    components: {
      OnboardingForm,
      KRadioButton,
      KButton,
    },
    $trs: {
      facilityPermissionsSetupFormHeader: 'Choose a Facility setup',
      facilityPermissionsSetupFormDescription:
        'How will you be using Kolibri? (You can customize these settings later)',
      facilityPermissionsPresetDetailsLink: 'More information about these settings',
      facilityPermissionsPresetDetailsHeader: 'Facility setup details',
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
      };
    },
    mounted() {
      this.$refs['first-button'].focus();
    },
    methods: {
      ...mapMutations({
        submitFacilityPermissions: 'SET_FACILITY_PRESET',
      }),
      setPermissions() {
        this.submitFacilityPermissions(this.selectedPreset);
        this.$emit('submit');
      },
      showFacilityPermissionsDetails() {
        this.permissionPresetDetailsModalShown = true;
      },
      hideFacilityPermissionsDetails() {
        this.permissionPresetDetailsModalShown = false;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  $margin-of-radio-button-text: 32px;

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
