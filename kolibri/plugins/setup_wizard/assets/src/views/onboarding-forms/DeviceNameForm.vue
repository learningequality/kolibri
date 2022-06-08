<template>

  <OnboardingStepBase
    :title="$tr('deviceNameTitle')"
    :description="$tr('deviceNameDescription')"
    @continue="handleContinue"
  >
    <KTextbox
      ref="textbox"
      v-model="value"
      :label="coreString('deviceNameLabel')"
      :autofocus="true"
      :maxlength="50"
      :invalid="Boolean(invalidText)"
      :invalidText="invalidText"
      @blur="shouldValidate = true"
    />
  </OnboardingStepBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'DeviceNameForm',
    components: {
      OnboardingStepBase,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        value: this.$store.state.onboardingData.device_name || '',
        shouldValidate: false,
      };
    },
    inject: ['wizardService'],
    computed: {
      invalidText() {
        if (!this.shouldValidate) {
          return '';
        }
        if (this.value.trim() === '') {
          return this.coreString('requiredFieldError');
        }
        return '';
      },
    },
    methods: {
      handleContinue() {
        this.shouldValidate = true;
        if (this.invalidText) {
          this.$refs.textbox.focus();
        } else {
          this.$store.commit('SET_DEVICE_NAME', this.value);
          this.goToNextStep();
        }
      },
      goToNextStep() {
        this.wizardService.send({ type: 'CONTINUE', value: this.value });
      },
    },
    $trs: {
      deviceNameTitle: {
        message: 'Device name',
        context: '',
      },
      deviceNameDescription: {
        message:
          'Give this device a meaningful name that can help you and others you connect with to recognize it',
        context: '',
      },
    },
  };

</script>
