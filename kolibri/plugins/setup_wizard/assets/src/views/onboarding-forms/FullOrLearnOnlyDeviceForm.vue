<template>

  <OnboardingStepBase
    :title="$tr('whatKindOfDeviceTitle')"
    @continue="handleContinue"
  >
    <KRadioButtonGroup>
      <KRadioButton
        v-model="selected"
        :label="$tr('fullDeviceLabel')"
        :buttonValue="Options.FULL"
        :description="$tr('fullDeviceDescription')"
        :autofocus="isFullSetup"
      />
      <KRadioButton
        v-model="selected"
        :label="$tr('learnOnlyDeviceLabel')"
        :buttonValue="Options.LOD"
        :description="$tr('learnOnlyDeviceDescription')"
        :autofocus="isLODSetup"
      />
    </KRadioButtonGroup>
  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';

  const Options = Object.freeze({
    FULL: 'FULL',
    LOD: 'LOD',
  });

  export default {
    name: 'FullOrLearnOnlyDeviceForm',
    components: {
      OnboardingStepBase,
    },
    inject: ['wizardService'],
    data() {
      const selected = this.wizardService.state.context['fullOrLOD'] || Options.FULL;
      return {
        Options,
        selected,
      };
    },
    computed: {
      isFullSetup() {
        return this.selected === Options.FULL;
      },
      isLODSetup() {
        return this.selected === Options.LOD;
      },
    },
    methods: {
      handleContinue() {
        this.wizardService.send({ type: 'CONTINUE', value: this.selected });
      },
    },
    $trs: {
      whatKindOfDeviceTitle: {
        message: 'What kind of device is this?',
        context:
          'Title for the Kolibri setup wizard step where user decides if they want to configure their device as only used by one or more learners, of as a full device to also be used by coaches and administrators.',
      },
      fullDeviceLabel: {
        message: 'Full device',
        context: '',
      },
      fullDeviceDescription: {
        message:
          'This device will be a fully-featured Kolibri server used by admins, coaches, and learners.',
        context: '',
      },
      learnOnlyDeviceLabel: {
        message: 'Learn-only device',
        context: '',
      },
      learnOnlyDeviceDescription: {
        message:
          'This device will only have the features used by learners, and it will auto-sync with the full device.',
        context: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  /deep/ .description {
    line-height: 1.5;
  }

</style>
