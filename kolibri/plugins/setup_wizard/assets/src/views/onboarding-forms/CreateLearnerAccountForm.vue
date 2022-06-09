<template>

  <OnboardingStepBase :title="$tr('header')" @continue="handleContinue">

    <KRadioButton
      ref="yesRadio"
      v-model="setting"
      class="radio-button"
      :label="$tr('yesOptionLabel')"
      :value="true"
    />
    <KRadioButton
      ref="noRadio"
      v-model="setting"
      class="radio-button"
      :label="$tr('noOptionLabel')"
      :value="false"
    />
    <p class="description">
      {{ $tr('changeLater') }}
    </p>
  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';
  import { Presets } from '../../constants';

  export default {
    name: 'CreateLearnerAccountForm',
    components: {
      OnboardingStepBase,
    },
    data() {
      let setting;
      const { preset } = this.$store.state.onboardingData;
      if (preset === Presets.NONFORMAL) {
        setting = true;
      } else {
        setting = false;
      }
      return {
        setting,
      };
    },
    inject: ['wizardService'],
    methods: {
      handleContinue() {
        this.wizardService.send({ type: 'CONTINUE', value: this.setting });
      },
    },
    $trs: {
      header: {
        message: 'Allow learners to join this facility?',
        context:
          'Admins have the option to allow either anyone to create a user account for themselves, or for accounts to be created only by Kolibri admins.\n\n',
      },
      yesOptionLabel: {
        message: 'Yes',
        context:
          "Possible answer to the 'Allow anyone to create their own learner account?' question.",
      },
      noOptionLabel: {
        message: 'No. Admins must create all accounts',
        context:
          "Possible answer to the 'Allow anyone to create their own learner account?' question.",
      },
      changeLater: {
        message: 'You can change this in your learning facility settings later',
        context: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    font-size: 1.5em;
  }

  .description {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

  .radio-button {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

</style>
