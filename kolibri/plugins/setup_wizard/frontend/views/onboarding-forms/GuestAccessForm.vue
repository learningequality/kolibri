<template>

  <OnboardingStepBase
    :title="$tr('header')"
    :footerMessageType="footerMessageType"
    :step="2"
    :steps="5"
    :description="$tr('description')"
    :eventOnGoBack="backEvent"
    @continue="handleContinue"
  >
    <KRadioButtonGroup>
      <KRadioButton
        ref="yesRadio"
        v-model="setting"
        :label="$tr('yesOptionLabel')"
        :buttonValue="true"
        :autofocus="setting"
      />
      <KRadioButton
        ref="noRadio"
        v-model="setting"
        :label="$tr('noOptionLabel')"
        :buttonValue="false"
        :autofocus="!setting"
      />
    </KRadioButtonGroup>
    <p class="form">
      {{ $tr('changeLater') }}
    </p>
  </OnboardingStepBase>

</template>


<script>

  import { Presets } from 'kolibri/constants';
  import { FooterMessageTypes } from '../../constants';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'GuestAccessForm',
    components: {
      OnboardingStepBase,
    },
    data() {
      let setting = this.wizardService.state.context['guestAccess'];
      if (setting === null) {
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
      yesOptionLabel: {
        message: 'Yes',
        context: 'Option label.',
      },
      description: {
        message:
          'This option allows anyone to view educational materials on Kolibri without needing to make an account',
        context:
          "Description of the 'Enable guest access?' option that an admin can configure in the set up process. It means that anyone can access Kolibri without having to create an account.",
      },
      header: {
        message: 'Enable users to explore Kolibri without an account?',
        context:
          'Option that an admin can configure in the set up process. If selected, guests can access Kolibri without the need to create an account.',
      },
      noOptionLabel: {
        message: 'No. Users must have an account to explore Kolibri.',
        context: "Possible answer to the 'Enable guest access?' question.",
      },
      changeLater: {
        message: 'You can change this in your device settings later.',
        context: 'Refers to the selected option for guest access in the setup wizard.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .info-icon {
    vertical-align: middle;
  }

  .form {
    font-size: 0.875em;
  }

</style>
