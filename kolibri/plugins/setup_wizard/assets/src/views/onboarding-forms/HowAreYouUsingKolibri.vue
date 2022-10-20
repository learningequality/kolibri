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
      :value="UsePresets.ON_MY_OWN"
      :label="$tr('onMyOwnLabel')"
      :description="$tr('onMyOwnDescription')"
    />
    <KRadioButton
      v-model="selected"
      :value="UsePresets.GROUP"
      :label="$tr('groupLearningLabel')"
      :description="$tr('groupLearningDescription')"
    />
  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';
  import { Presets, UsePresets } from '../../constants';

  export default {
    name: 'HowAreYouUsingKolibri',
    components: { OnboardingStepBase },
    inject: ['wizardService'],
    data() {
      return {
        selected: UsePresets.ON_MY_OWN,
      };
    },
    computed: {
      isOnMyOwnSetup() {
        return this.selected === UsePresets.ON_MY_OWN;
      },
      UsePresets() {
        return UsePresets;
      },
    },
    methods: {
      handleContinue() {
        if (this.isOnMyOwnSetup) {
          // If the user is on their own, set the preset to personal here
          // If not then the user will set it using a form later on
          this.$store.commit('SET_FACILITY_PRESET', Presets.PERSONAL);
        }
        this.goToNextStep();
      },
      goToNextStep() {
        this.wizardService.send({ type: 'CONTINUE', value: this.selected });
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
