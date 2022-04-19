<template>

  <OnboardingForm
    :header="coreString('deviceNameLabel')"
    :description="$tr('deviceNameExplanation')"
    @submit="handleSubmit"
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
  </OnboardingForm>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'DeviceNameForm',
    components: {
      OnboardingForm,
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
      handleSubmit() {
        this.shouldValidate = true;
        if (this.invalidText) {
          this.$refs.textbox.focus();
        } else {
          this.$store.commit('SET_DEVICE_NAME', this.value);
          this.wizardService.send('CONTINUE');
        }
      },
    },
    $trs: {
      deviceNameExplanation: {
        message:
          'Giving this device a meaningful name can help you and others you connect with to recognize it',

        context: 'Device naming description which is displayed when a user creates a new device.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
