<template>

  <OnboardingStepBase
    :title="$tr('header')"
    :footerMessageType="footerMessageType"
    :step="4"
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
  import { FooterMessageTypes } from '../../constants';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'RequirePasswordForLearnersForm',
    components: {
      OnboardingStepBase,
    },
    mixins: [commonSyncElements],
    inject: ['wizardService'],
    data() {
      let setting = this.wizardService.state.context['requirePassword'];
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
        message: 'Enable passwords on learner accounts?',
        context:
          'Admins can either enable passwords for learners or offer a simplified sign-in, without the password requirement. This allows easier access for younger learners.',
      },
      yesOptionLabel: {
        message: 'Yes',
        context:
          "Option on the 'Enable passwords for learners' screen. The admin selects this option if they don't want to enable passwords for learner accounts.",
      },
      noOptionLabel: {
        message: 'No. Learners can sign in with just a username.',
        context:
          "Option on the 'Enable passwords for learners' screen. The admin selects this option if they don't want to enable passwords for learner accounts.",
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
