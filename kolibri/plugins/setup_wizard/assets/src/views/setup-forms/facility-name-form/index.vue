<template>

  <form>
    <fieldset>
      <legend>
        <h1>
          Set facility name
        </h1>
      </legend>

      <k-textbox v-model="facilityName" label="Facility name"/>

      <k-button type="submit" :text="submitText" />

    </fieldset>
  </form>

</template>


<script>

  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    name: 'facilityNameForm',
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    components: {
      kTextbox,
      kButton,
    },
    data() {
      return {
        facilityName: '',
      };
    },
  };

</script>


<style lang="stylus" scoped></style>
