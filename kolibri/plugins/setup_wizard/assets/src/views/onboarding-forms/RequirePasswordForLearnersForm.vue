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
      let settingIsEnabled = true;
      if (this.$store.state.onboardingData.preset === 'formal') {
        settingIsEnabled = false;
      }
      return {
        settingIsEnabled,
      };
    },
    methods: {
      setSetting() {
        this.$store.commit('SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD', this.settingIsEnabled);
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
