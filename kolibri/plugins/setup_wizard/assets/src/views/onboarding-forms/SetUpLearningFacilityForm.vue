<template>

  <OnboardingStepBase
    :title="$tr('setUpFacilityTitle')"
    :description="$tr('setUpFacilityDescription')"
    @continue="handleContinue"
  >
    <KRadioButton
      v-model="selected"
      :label="$tr('createFacilityLabel')"
      :value="Options.NEW"
      class="radio-button"
    />
    <KRadioButton
      v-model="selected"
      :label="$tr('importFacilityLabel')"
      :value="Options.IMPORT"
      class="radio-button"
    />
    <SelectAddressModalGroup
      v-if="showSelectAddressModal"
      @cancel="showSelectAddressModal = false"
      @submit="handleContinueImport"
    />
  </OnboardingStepBase>

</template>


<script>

  import { SelectAddressModalGroup } from 'kolibri.coreVue.componentSets.sync';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { FacilityTypePresets as Options } from '../../constants';

  export default {
    name: 'SetUpLearningFacilityForm',
    components: {
      OnboardingStepBase,
      SelectAddressModalGroup,
    },
    inject: ['wizardService'],
    data() {
      return {
        Options,
        selected: Options.NEW,
        showSelectAddressModal: false,
      };
    },
    methods: {
      handleContinueImport(address) {
        this.wizardService.send({
          type: 'CONTINUE',
          value: { importOrNew: Options.IMPORT, importDeviceId: address.id },
        });
      },
      handleContinue() {
        if (this.selected === Options.IMPORT) {
          this.showSelectAddressModal = true;
        } else {
          this.wizardService.send({ type: 'CONTINUE', value: { importOrNew: Options.NEW } });
        }
      },
    },
    $trs: {
      setUpFacilityTitle: {
        message: 'Set up learning facility for this full device',
        context: '',
      },
      setUpFacilityDescription: {
        message:
          'Learning facility represents the location where you are installing Kolibri, such as a school, training center, or a home',
        context: '',
      },
      createFacilityLabel: {
        message: 'Create a new learning facility',
        context: '',
      },
      importFacilityLabel: {
        message: 'Import all data from an existing learning facility',
        context: '',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .radio-button {
    padding-bottom: 8px;
    font-size: 0.875em;
  }

</style>
