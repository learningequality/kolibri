<template>

  <OnboardingStepBase
    dir="auto"
    :noBackAction="true"
    :title="getCommonSyncString('howAreYouUsingKolibri')"
    @continue="handleContinue"
  >
    <KRadioButton
      v-model="selected"
      style="margin-bottom: 1em"
      :value="UsePresets.ON_MY_OWN"
      :label="$tr('onMyOwnLabel')"
      :description="getCommonSyncString('onMyOwn')"
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

  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { Presets, UsePresets } from '../../constants';

  export default {
    name: 'HowAreYouUsingKolibri',
    components: { OnboardingStepBase },
    mixins: [commonSyncElements],
    inject: ['wizardService'],
    data() {
      const selected = this.wizardService.state.context['onMyOwnOrGroup'] || UsePresets.ON_MY_OWN;
      return {
        selected,
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
      onMyOwnLabel: {
        message: 'On my own',
        context: 'Label for a radio button...',
      },
      groupLearningLabel: {
        message: 'Group learning',
        context: 'label',
      },
      groupLearningDescription: {
        message:
          'This device will need to connect with other devices using Kolibri in schools or other group learning settings.',
        context: 'desc',
      },
    },
  };

</script>
