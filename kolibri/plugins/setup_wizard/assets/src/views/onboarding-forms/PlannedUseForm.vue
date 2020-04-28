<template>

  <OnboardingForm
    :header="$tr('plannedUseHeader')"
    @submit="handleSubmit"
  >
    <KRadioButton
      v-model="selected"
      :value="Options.PERSONAL"
      :label="$tr('personalUseLabel')"
      :description="$tr('personalUseDescription')"
    />
    <KRadioButton
      v-model="selected"
      :value="Options.PUBLIC"
      :label="$tr('publicUseLabel')"
      :description="$tr('publicUseDescription')"
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
    name: 'PlannedUseForm',
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
      plannedUseHeader: {
        message: 'How are you using Kolibri?',
        context: 'Page title for the device setup step',
      },
      personalUseLabel: {
        message: 'Personal use',
        context: 'Label for the radio button option in the device setup',
      },
      personalUseDescription: {
        message: 'Homeschooling, supplementary individual learning, and other self-directed use',
        context: 'Option description text',
      },
      publicUseLabel: {
        message: 'Public use',
        context: 'Label for the radio button option in the device setup',
      },
      publicUseDescription: {
        message:
          'A school, educational program, organization or other group learning setting that will share the use of Kolibri',
        context: 'Option description text',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
