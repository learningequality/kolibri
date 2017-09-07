<template>

  <onboarding-form
    :header="$tr('facilityPermissionsSetupFormHeader')"
    :submit-text="submitText"
    :description="$tr('facilityPermissionsSetupFormDescription')"
    @submit="setPermissions">

    <template v-for="(preset, value) in permissionPresets">
      <label>
        <k-radio-button
        v-model="selectedPermissionPreset"
        :radiovalue="value"
        :label="preset.name"
        />
        {{ presetDescription(value) }}
      </label>

    </template>

  </onboarding-form>

</template>


<script>

  import { permissionPresets } from '../../../state/constants';
  import { submitFacilityPermissions } from '../../../state/actions/forms';

  import onboardingForm from '../onboarding-form';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';

  // TODO add modal and link to open it

  export default {
    name: 'selectPermissionsForm',
    $trs: {
      facilityPermissionsSetupFormHeader: 'Choose a Facility setup',
      facilityPermissionsSetupFormDescription:
        'How will you be using Kolibri? You can customize ' + 'these settings later.',
      facilityPermissionsPresetDetailsLink: 'Setup details',
      adminManagedSetupDescription: 'For schools and other formal learning contexts',
      selfManagedSetupDescription:
        'For libraries, orphanages, correctional facilities, ' +
          'youth centers, computer labs, and other non-formal learning contexts',
      informalSetupDescription:
        'For parent-child learning, homeschooling, or supplementary ' + 'individual learning',
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      onboardingForm,
      kRadioButton,
    },
    data() {
      return {
        selectedPermissionPreset: this.currentPermissionPreset,
        permissionPresets,
      };
    },
    methods: {
      setPermissions() {
        this.submitFacilityPermissions(this.selectedPermissionPreset);
        this.$emit('submit');
      },
      presetDescription(preset) {
        console.log(preset);
        switch (preset) {
          case 'formal':
            return this.$tr('adminManagedSetupDescription');
          case 'informal':
            return this.$tr('selfManagedSetupDescription');
          case 'nonformal':
            return this.$tr('informalSetupDescription');
        }
      },
    },
    vuex: {
      actions: {
        submitFacilityPermissions,
      },
      getters: {
        currentPermissionPreset: state => state.onboardingData.preset,
      },
    },
  };

</script>


<style lang="stylus"></style>