<template>

  <OnboardingStepBase
    :title="$tr('header')"
    :footerMessageType="footerMessageType"
    :step="3"
    :steps="5"
    :eventOnGoBack="backEvent"
    @continue="handleContinue"
  >
    <KRadioButtonGroup>
      <KRadioButton
        ref="yesRadio"
        v-model="setting"
        class="radio-button"
        :label="$tr('yesOptionLabel')"
        :buttonValue="true"
        :autofocus="setting"
      />
      <KRadioButton
        ref="noRadio"
        v-model="setting"
        class="radio-button"
        :label="$tr('noOptionLabel')"
        :buttonValue="false"
        :autofocus="!setting"
      />
    </KRadioButtonGroup>
    <p class="description">
      {{ getCommonSyncString('changeLater') }}
    </p>
  </OnboardingStepBase>

</template>


<script>

  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { Presets } from 'kolibri/constants';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { FooterMessageTypes } from '../../constants';

  export default {
    name: 'CreateLearnerAccountForm',
    components: {
      OnboardingStepBase,
    },
    mixins: [commonSyncElements],
    data() {
      let setting = this.wizardService.state.context['learnerCanCreateAccount'];
      if (setting === null) {
        // Set default for the setting if one isn't selected; depends on the preset selected
        const preset = this.wizardService.state.context['formalOrNonformal'];
        setting = preset === Presets.NONFORMAL;
      }
      const footerMessageType = FooterMessageTypes.NEW_FACILITY;
      return {
        footerMessageType,
        setting,
      };
    },
    inject: ['wizardService'],
    computed: {
      backEvent() {
        return { type: 'BACK', value: Boolean(this.setting) };
      },
    },
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
        message: 'No. Admins must create an account for them to join this facility.',
        context:
          "Possible answer to the 'Allow anyone to create their own learner account?' question.",
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
