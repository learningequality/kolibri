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
      :value="Options.INDIVIDUAL"
      :label="$tr('onMyOwnLabel')"
      :description="$tr('onMyOwnDescription')"
    />
    <KRadioButton
      v-model="selected"
      :value="Options.GROUP"
      :label="$tr('groupLearningLabel')"
      :description="$tr('groupLearningDescription')"
    />
  </OnboardingStepBase>

</template>


<script>

  import OnboardingStepBase from '../OnboardingStepBase';

  const Options = Object.freeze({
    INDIVIDUAL: 'individual',
    GROUP: 'group',
  });

  export default {
    name: 'HowAreYouUsingKolibri',
    components: { OnboardingStepBase },
    inject: ['wizardService'],
    data() {
      return {
        selected: Options.INDIVIDUAL,
      };
    },
    computed: {
      isIndividualSetup() {
        return this.selected === Options.INDIVIDUAL;
      },
      Options() {
        return Options;
      },
    },
    methods: {
      handleContinue() {
        this.$store.commit('SET_FACILITY_PRESET', this.isIndividualSetup ? Options.INDIVIDUAL : '');
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
