<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :settingIsEnabled="settingIsEnabled"
    :headerText="$tr('header')"
    @submit="handleSubmit"
  />

</template>


<script>

  import YesNoForm from './YesNoForm';

  export default {
    name: 'CreateLearnerAccountForm',
    components: {
      YesNoForm,
    },
    data() {
      return {
        settingIsEnabled: this.$store.state.onboardingData.settings.learner_can_sign_up,
      };
    },
    methods: {
      handleSubmit(setting) {
        this.$store.commit('SET_LEARNER_CAN_SIGN_UP', setting);
        this.$emit('click_next');
      },
    },
    $trs: {
      header: 'Allow anyone to create their own learner account?',
      noOptionLabel: 'No. Admins must create all accounts',
    },
  };

</script>


<style lang="scss" scoped></style>
