<template>

  <onboarding-form header="Select permissions" :submit-text="submitText" @submit="setPermissions">
    <k-radio-button
      v-for="(preset, value) in permissionPresets"
      v-model="selectedPermissionPreset"
      :radiovalue="value"
      :label="preset.name"
    />
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