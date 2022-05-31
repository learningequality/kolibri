<template>

  <OnboardingStepBase
    :title="$tr('whatKindOfDeviceTitle')"
    @submit="handleSubmit"
  >
    <KRadioButton
      v-model="selected"
      :label="$tr('fullDeviceLabel')"
      :value="$tr('fullDeviceLabel')"
      :description="$tr('fullDeviceDescription')"
    />
    <KRadioButton
      v-model="selected"
      :label="$tr('learnOnlyDeviceLabel')"
      :value="$tr('learnOnlyDeviceLabel')"
      :description="$tr('learnOnlyDeviceDescription')"
    />
  </OnboardingStepBase>

</template>


<script>

  import { Presets } from '../../constants';
  import OnboardingStepBase from '../OnboardingStepBase';

  const Options = Object.freeze({
    PUBLIC: 'PUBLIC',
    PERSONAL: 'PERSONAL',
  });

  export default {
    name: 'FullOrLearnOnlyDeviceForm',
    components: {
      OnboardingStepBase,
    },
    data() {
      let selected;
      const { preset } = this.$store.state.onboardingData;
      if (preset === null || preset === Presets.PERSONAL) {
        selected = Options.PERSONAL;
      } else {
        selected = Options.PUBLIC;
      }
      return {
        selected,
      };
    },
    $trs: {
      whatKindOfDeviceTitle: {
        message: 'What kind of device is this?',
        context: '',
      },
      fullDeviceLabel: {
        message: 'Full device',
        context: '',
      },
      fullDeviceDescription: {
        message:
          'This device will be a fully featured Kolibri server used by admins, coaches and learners',
        context: '',
      },
      learnOnlyDeviceLabel: {
        message: 'Learn-only device',
        context: '',
      },
      learnOnlyDeviceDescription: {
        message:
          'This device will have one or more learner accounts from a full device that already exists. Learner accounts will be auto-synced with the full device',
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
