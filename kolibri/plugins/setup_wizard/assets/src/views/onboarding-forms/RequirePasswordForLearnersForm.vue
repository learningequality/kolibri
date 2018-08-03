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
    name: 'RequirePasswordForLearnersForm',
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
      header: 'Require passwords for learners to sign in',
      noOptionLabel: 'No. Learners can sign in with just their username',
    },
  };

</script>


<style lang="scss" scoped></style>
