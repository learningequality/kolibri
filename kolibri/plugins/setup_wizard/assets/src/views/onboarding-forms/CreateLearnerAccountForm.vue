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
      header: {
        message: 'Allow anyone to create their own learner account?',
        context:
          'Admins have the option to allow either anyone to create a user account for themselves, or for accounts to be created only by Kolibri admins.\n\n',
      },
      noOptionLabel: {
        message: 'No. Admins must create all accounts',
        context:
          'Possible answer to the \'Allow anyone to create their own learner account?" question.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
