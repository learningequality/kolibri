<template>

  <OnboardingStepBase
    :title="$tr('setUpFacilityTitle')"
    :description="$tr('setUpFacilityDescription')"
    @continue="handleContinue"
  >
    <KRadioButtonGroup>
      <KRadioButton
        v-model="selected"
        :label="$tr('createFacilityLabel')"
        :buttonValue="Options.NEW"
        class="radio-button"
        :autofocus="isNewFacilitySetup"
      />
      <KRadioButton
        v-model="selected"
        :label="$tr('importFacilityLabel')"
        :buttonValue="Options.IMPORT"
        class="radio-button"
        :autofocus="isImportFacilitySetup"
      />
    </KRadioButtonGroup>
    <SelectDeviceModalGroup
      v-if="showSelectAddressModal"
      :filterByOnMyOwnFacility="false"
      @cancel="showSelectAddressModal = false"
      @submit="handleContinueImport"
    />
  </OnboardingStepBase>

</template>


<script>

  import SelectDeviceModalGroup from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup';
  import OnboardingStepBase from '../OnboardingStepBase';
  import { FacilityTypePresets as Options } from '../../constants';

  export default {
    name: 'SetUpLearningFacilityForm',
    components: {
      OnboardingStepBase,
      SelectDeviceModalGroup,
    },
    inject: ['wizardService'],
    data() {
      const selected = this.wizardService.state.context['importOrNew'] || Options.NEW;
      return {
        Options,
        selected,
        showSelectAddressModal: false,
      };
    },
    computed: {
      isNewFacilitySetup() {
        return this.selected === Options.NEW;
      },
      isImportFacilitySetup() {
        return this.selected === Options.IMPORT;
      },
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
        message: 'Set up the learning facility for this full device',
        context: '',
      },
      setUpFacilityDescription: {
        message:
          'A learning facility is the location where you use Kolibri, such as a school, training center, or your home.',
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
