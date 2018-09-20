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
      const { settings, preset } = this.$store.state.onboardingData;
      if (settings.learner_can_sign_up !== null) {
        return {
          settingIsEnabled: settings.learner_can_sign_up,
        };
      }
      // Default is False only for "formal" preset
      return {
        settingIsEnabled: preset !== 'formal',
      };
    },
    methods: {
      setSetting(setting) {
        this.$store.commit('SET_LEARNER_CAN_SIGN_UP', setting);
        this.$emit('submit');
      },
    },
    $trs: {
      header: 'Allow anyone to create their own learner account?',
      noOptionLabel: 'No. Admins must create all accounts',
    },
  };

</script>


<style lang="scss" scoped></style>
