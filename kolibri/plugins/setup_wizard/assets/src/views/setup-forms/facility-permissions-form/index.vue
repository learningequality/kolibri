<template>

  <form @submit="setPermissions">
    <fieldset>
      <legend>
        <h1>
          Select permissions
        </h1>
      </legend>

      <k-radio-button
        v-for="(preset, value) in permissionPresets"
        v-model="selectedPermissionPreset"
        :radiovalue="value"
        :label="preset.name"/>

      <k-button type="submit" :text="submitText" />

    </fieldset>
  </form>

</template>


<script>

  import { permissionPresets } from '../../../state/constants';
  import { submitFacilityPermissions } from '../../../state/actions/forms';

  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';

  // TODO add modal and link to open it

  export default {
    name: 'selectPermissionsForm',
    props: {
      submitText: {
        type: String,
        required: true,
      },
      onboardingData: {
        type: Object,
        required: true,
      },
    },
    components: {
      kTextbox,
      kButton,
      kRadioButton,
    },
    data() {
      return {
        selectedPermissionPreset: this.onboardingData.preset,
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
    },
  };

</script>


<style lang="stylus"></style>