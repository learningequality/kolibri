<template>

  <YesNoForm
    :noOptionLabel="$tr('noOptionLabel')"
    :noOptionTooltip="$tr('noOptionTooltip')"
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
      const { settings, preset } = this.$store.state.onboardingData;
      if (settings.learner_can_login_with_no_password !== null) {
        return {
          settingIsEnabled: settings.learner_can_login_with_no_password,
        };
      }
      // Default is False only for "formal" preset
      return {
        settingIsEnabled: preset !== 'formal',
      };
    },
    methods: {
      setSetting(setting) {
        this.$store.commit('SET_LEARNER_CAN_LOGIN_WITH_NO_PASSWORD', setting);
        this.$emit('submit');
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
