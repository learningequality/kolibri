<template>

  <OnboardingStepBase
    :title="coreString('deviceNameLabel')"
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

  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import OnboardingStepBase from '../OnboardingStepBase';

  export default {
    name: 'DeviceNameForm',
    components: {
      OnboardingStepBase,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        value: this.wizardService.state.context['deviceName'],
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
          this.goToNextStep();
        }
      },
      goToNextStep() {
        this.wizardService.send({ type: 'CONTINUE', value: this.value });
      },
    },
    $trs: {
      deviceNameDescription: {
        message:
          'Give this device a name that can be easily recognized by you and others you connect with.',
        context: '',
      },
    },
  };

</script>
