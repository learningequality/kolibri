<template>

  <form>
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
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';

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
  };

</script>


<style lang="stylus"></style>