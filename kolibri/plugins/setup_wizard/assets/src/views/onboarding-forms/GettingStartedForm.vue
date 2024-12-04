<template>

  <OnboardingForm
    :header="getCommonSyncString('howAreYouUsingKolibri')"
    @submit="handleSubmit"
  >
    <KRadioButtonGroup>
      <KRadioButton
        v-model="selected"
        :buttonValue="Options.PERSONAL"
        :label="$tr('quickStartLabel')"
        :description="getCommonSyncString('onMyOwn')"
      />
      <KRadioButton
        v-model="selected"
        :buttonValue="Options.PUBLIC"
        :label="$tr('advancedSetupLabel')"
        :description="$tr('advancedSetupDescription')"
      />
    </KRadioButtonGroup>
  </OnboardingForm>

</template>


<script>

  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { Presets } from 'kolibri/constants';
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
    mixins: [commonSyncElements],
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
    inject: ['wizardService'],
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
        this.wizardService.send({ type: 'CONTINUE', value: this.isPersonal });
      },
    },
    $trs: {
      quickStartLabel: {
        message: 'Quick start',
        context: 'Label for the radio button option in the device setup.',
      },
      advancedSetupLabel: {
        message: 'Advanced setup',
        context: 'Label for the radio button option in the device setup.',
      },
      advancedSetupDescription: {
        message:
          'For schools, educational programs, organizations, or other group learning settings that will share the use of Kolibri',

        context: "Option description text for 'Advanced setup'.",
      },
    },
  };

</script>


<style lang="scss" scoped></style>
