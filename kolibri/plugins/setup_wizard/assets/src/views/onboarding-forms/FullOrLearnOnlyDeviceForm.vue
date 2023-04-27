<template>

  <OnboardingStepBase
    :title="$tr('whatKindOfDeviceTitle')"
    @continue="handleContinue"
  >
    <KRadioButton
      v-model="selected"
      :label="$tr('fullDeviceLabel')"
      :value="Options.FULL"
      :description="$tr('fullDeviceDescription')"
    />
    <KRadioButton
      v-model="selected"
      :label="$tr('learnOnlyDeviceLabel')"
      :value="Options.LOD"
      :description="$tr('learnOnlyDeviceDescription')"
    />
  </OnboardingStepBase>

</template>


<script>

  import get from 'lodash/get';
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
      const selected = get(this, 'wizardService.context.setupType', Options.FULL);
      return {
        Options,
        selected,
      };
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
          'This device will have one or more learner accounts imported from a full device that already exists. Learner accounts will auto-sync with the full device.',
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
