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
    name: 'CreateLearnerAccountForm',
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
        this.$store.commit('SET_LEARNER_CAN_SIGN_UP', this.settingIsEnabled);
        this.$emit('submit');
      },
    },
    $trs: {
      header: 'Allow anyone to create their own learner account?',
      noOptionLabel: 'No. Admins must create all user accounts',
    },
  };

</script>


<style lang="scss" scoped></style>
