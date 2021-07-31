<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :noOptionDescription="$tr('noOptionTooltip')"
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
      header: {
        message: 'Enable passwords on learner accounts?',
        context:
          'Admins can either enable passwords for learners or offer a simplified sign-in, without the password requirement. This allows easier access for younger learners.',
      },
      noOptionLabel: {
        message: 'No. Learner accounts can sign in with just a username',
        context:
          "Option on the 'Enable passwords for learners' screen. The admin selects this option if they don't want to enable passwords for learner accounts.",
      },
      noOptionTooltip: {
        message:
          'Helpful for younger learners or when you are not concerned about account security',
        context:
          "Additional information in the form of a tooltip about the 'No' option in the 'Enable passwords for younger learners' screen.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
