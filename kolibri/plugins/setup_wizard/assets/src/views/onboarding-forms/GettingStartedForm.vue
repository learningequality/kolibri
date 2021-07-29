<template>

  <OnboardingForm
    :header="$tr('gettingStarted')"
    @submit="handleSubmit"
  >
    <KRadioButton
      v-model="selected"
      :value="Options.PERSONAL"
      :label="$tr('quickStartLabel')"
      :description="$tr('quickStartDescription')"
    />
    <KRadioButton
      v-model="selected"
      :value="Options.PUBLIC"
      :label="$tr('advancedSetupLabel')"
      :description="$tr('advancedSetupDescription')"
    />
  </OnboardingForm>

</template>


<script>

  import { Presets } from '../../constants';
  import OnboardingForm from './OnboardingForm';

  const Options = Object.freeze({
    PUBLIC: 'PUBLIC',
    PERSONAL: 'PERSONAL',
  });

  export default {
    name: 'GettingStartedForm',
    components: {
      OnboardingForm,
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
        Options,
      };
    },
    computed: {
      isPersonal() {
        return this.selected === Options.PERSONAL;
      },
    },
    methods: {
      handleSubmit() {
        this.$store.commit('SET_FACILITY_PRESET', this.isPersonal ? Presets.PERSONAL : '');
        this.goToNextStep();
      },
      goToNextStep() {
        this.$router.push({
          name: this.isPersonal ? 'PERSONAL_SETUP' : 'DEVICE_NAME',
        });
      },
    },
    $trs: {
      gettingStarted: {
        message: 'How are you using Kolibri?',
        context: 'Page title for the device setup step',
      },
      quickStartLabel: {
        message: 'Quick start',
        context: 'Label for the radio button option in the device setup',
      },
      quickStartDescription: {
        message:
          'For homeschooling, supplementary individual learning, and other self-directed use',

        context: 'Option description text',
      },
      advancedSetupLabel: {
        message: 'Advanced setup',
        context: 'Label for the radio button option in the device setup',
      },
      advancedSetupDescription: {
        message:
          'For schools, educational programs, organizations, or other group learning settings that will share the use of Kolibri',

        context: 'Option description text',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
