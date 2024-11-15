<template>

  <OnboardingStepBase
    dir="auto"
    :noBackAction="true"
    :title="getCommonSyncString('howAreYouUsingKolibri')"
    @continue="handleContinue"
  >
    <KRadioButtonGroup>
      <KRadioButton
        v-model="selected"
        style="margin-bottom: 1em"
        :buttonValue="Presets.PERSONAL"
        :label="$tr('onMyOwnLabel')"
        :description="getCommonSyncString('onMyOwn')"
        :autofocus="selected !== UsePresets.GROUP"
      />
      <KRadioButton
        v-model="selected"
        :buttonValue="UsePresets.GROUP"
        :label="$tr('groupLearningLabel')"
        :description="$tr('groupLearningDescription')"
        :autofocus="selected === UsePresets.GROUP"
      />
    </KRadioButtonGroup>
  </OnboardingStepBase>

</template>


<script>

  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import { Presets } from 'kolibri/constants';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { UsePresets } from '../../constants';

  export default {
    name: 'HowAreYouUsingKolibri',
    components: { OnboardingStepBase },
    mixins: [commonSyncElements],
    inject: ['wizardService'],
    data() {
      const selected = this.wizardService.state.context['onMyOwnOrGroup'] || Presets.PERSONAL;
      return {
        selected,
      };
    },
    computed: {
      UsePresets() {
        return UsePresets;
      },
      Presets() {
        return Presets;
      },
    },
    methods: {
      handleContinue() {
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
