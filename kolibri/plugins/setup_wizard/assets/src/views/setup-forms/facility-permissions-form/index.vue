<template>

  <form @submit="setPermissions">
    <fieldset>
      <legend>
        <h1>
          Select permissions
        </h1>
      </legend>

      <k-radio-button />
      <k-radio-button />
      <k-radio-button />

      <k-button type="submit" :text="submitText" />

    </fieldset>
  </form>

</template>


<script>

  import { facilityPresetChoices } from '../../../state/constants';
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
    },
    components: {
      kTextbox,
      kButton,
      kRadioButton,
    },
    data() {
      return {
        permissionPreset: '',
      };
    },
    methods: {
      setPermissions() {
        this.submitFacilityPermissions(this.permissionPreset);
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