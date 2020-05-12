<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :noOptionTooltip="$tr('noOptionTooltip')"
    :settingIsEnabled="settingIsEnabled"
    :headerText="$tr('header')"
    @submit="handleSubmit"
  />

</template>


<script>

  import YesNoForm from './YesNoForm';

  export default {
    name: 'RequirePasswordForLearnersForm',
    components: {
      YesNoForm,
    },
    data() {
      return {
        // NOTE: The 'Yes' option should set this to false
        settingIsEnabled: !this.$store.state.onboardingData.settings
          .learner_can_login_with_no_password,
      };
    },
    methods: {
      handleSubmit(setting) {
        // NOTE: Notice that setting is negated
        this.$store.commit('SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD', !setting);
        this.$emit('click_next');
      },
    },
    $trs: {
      header: 'Enable passwords on learner accounts?',
      noOptionLabel: 'No. Learner accounts can sign in with just a username',
      noOptionTooltip:
        'Helpful for younger learners or when you are not concerned about account security',
    },
  };

</script>


<style lang="scss" scoped></style>
