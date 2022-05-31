<template>

  <OnboardingStepBase
    dir="auto"
    :noBackAction="true"
    :title="$tr('howAreYouUsingKolibriTitle')"
    @continue="handleContinue"
  >
    <KRadioButton
      v-model="selected"
      style="margin-bottom: 1em"
      :value="Options.PERSONAL"
      :label="$tr('onMyOwnLabel')"
      :description="$tr('onMyOwnDescription')"
    />
    <KRadioButton
      v-model="selected"
      :value="Options.PUBLIC"
      :label="$tr('groupLearningLabel')"
      :description="$tr('groupLearningDescription')"
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
    name: 'HowAreYouUsingKolibri',
    components: { OnboardingStepBase },
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
      handleContinue() {
        this.$store.commit('SET_FACILITY_PRESET', this.isPersonal ? Presets.PERSONAL : '');
        this.goToNextStep();
      },
      goToNextStep() {
        this.wizardService.send({ type: 'CONTINUE', value: this.isPersonal });
      },
    },
    $trs: {
      howAreYouUsingKolibriTitle: {
        message: 'How are you using Kolibri?',
        context: 'hello',
      },
      onMyOwnLabel: {
        message: 'On my own',
        context: 'Label for a radio button...',
      },
      onMyOwnDescription: {
        message:
          'For homeschooling, supplementary individual learning, and other self-directed use',
        context: 'Description',
      },
      groupLearningLabel: {
        message: 'Group learning',
        context: 'label',
      },
      groupLearningDescription: {
        message:
          'This device will need to connect with other devices using Kolibri in schools, educational programs, organizations, or other group learning settings',
        context: 'desc',
      },
    },
  };

</script>
