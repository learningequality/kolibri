<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :settingIsEnabled="settingIsEnabled"
    :submitText="submitText"
    :headerText="$tr('header')"
    @submit="setSetting"
  />

</template>


<script>

  import YesNoForm from './YesNoForm';

  export default {
    name: 'GuestAccessForm',
    components: {
      YesNoForm,
    },
    props: {
      submitText: {
        type: String,
        required: true,
      },
    },
    data() {
      return {
        settingIsEnabled: true,
      };
    },
    methods: {
      setSetting(setting) {
        console.log(setting);
        this.$emit('submit');
      },
    },
    $trs: {
      header: 'Allow anyone to use Kolibri as a guest?',
      noOptionLabel: 'No. Users must sign into view content',
    },
  };

</script>


<style lang="scss" scoped>

  .details {
    margin-top: 16px;
  }

</style>
