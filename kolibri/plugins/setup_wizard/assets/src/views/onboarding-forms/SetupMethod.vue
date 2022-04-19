<template>

  <OnboardingForm
    :header="$tr('initializeDevice')"
    @submit="handleSubmit"
  >
    <p class="p1">
      {{ $tr('descriptionParagraph1') }}
    </p>
    <h3>
      {{ $tr('fullDevice') }}
      <CoreInfoIcon
        :iconAriaLabel="$tr('fullDeviceTooltip')"
        :tooltipText="$tr('fullDeviceTooltip')"
      />
    </h3>
    <KRadioButton
      v-model="initializeMethod"
      :label="$tr('createNewFacilityAction')"
      :value="'new'"
    />
    <KRadioButton
      v-model="initializeMethod"
      :label="$tr('importFacilityAction')"
      :value="'import'"
    />


    <h3 class="learn-only-device">
      {{ $tr('lod') }}
      <CoreInfoIcon
        :iconAriaLabel="$tr('lodTooltip')"
        :tooltipText="$tr('lodTooltip')"
      />
    </h3>
    <KRadioButton
      v-model="initializeMethod"
      :description="$tr('descriptionImportLOD')"
      :label="$tr('importLOD')"
      :value="'lod'"
    />

    <SelectAddressModalGroup
      v-if="showAddressModal"
      @submit="startFacilityImportFlow"
      @cancel="showAddressModal = false"
    />
    <SelectAddressModalGroup
      v-if="showLODAddressModal"
      :filterLODAvailable="true"
      @submit="startLODImportFlow"
      @cancel="showLODAddressModal = false"
    />
  </OnboardingForm>

</template>


<script>

  import { SelectAddressModalGroup } from 'kolibri.coreVue.componentSets.sync';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import CoreInfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'SetupMethod',
    components: {
      CoreInfoIcon,
      OnboardingForm,
      SelectAddressModalGroup,
    },
    mixins: [commonSyncElements],
    data() {
      return {
        showAddressModal: false,
        showLODAddressModal: false,
        initializeMethod: 'new',
      };
    },
    inject: ['wizardService'],
    methods: {
      handleSubmit() {
        switch (this.initializeMethod) {
          case 'new':
            this.startNewFacilityFlow();
            break;
          case 'import':
            this.showAddressModal = true;
            break;
          case 'lod':
            this.showLODAddressModal = true;
            break;
        }
      },

      startNewFacilityFlow() {
        this.wizardService.send({ type: 'CONTINUE', value: 'new' });
      },
      startFacilityImportFlow(address) {
        this.wizardService.send({ type: 'CONTINUE', value: 'import' });
        this.$router.push({
          path: '/import_facility/1',
          query: {
            device_id: address.id,
          },
        });
      },
      startLODImportFlow(address) {
        this.wizardService.send({ type: 'CONTINUE', value: 'lod' });
        this.$router.push({
          path: '/import_lod/1',
          query: {
            device_id: address.id,
          },
        });
      },
    },
    $trs: {
      initializeDevice: {
        message: 'Select a facility setup for this device',
        context: 'Heading for the window to select facility type.',
      },
      fullDevice: {
        message: 'Full device',
        context:
          "Device that will be a fully featured Kolibri server used by admins, coaches and learners (in this context 'Full' does not refer to storage capacity).",
      },
      fullDeviceTooltip: {
        message:
          'Device will be a fully featured Kolibri server used by admins, coaches and learners',

        context:
          'Tooltip for Full device. A Full device is a type of Kolibri device that has all features available.',
      },
      lod: {
        message: 'Learn-only device',
        context:
          'Device that has Kolibri features for learners, but not those for coaches and admins.',
      },
      lodTooltip: {
        message:
          'Device will have Kolibri features for learners, but not those for coaches and admins',

        context:
          'Tooltip for Learn-only device. A Learn-only device is a type of Kolibri device that has only the features for learners.',
      },
      descriptionParagraph1: {
        message:
          'A facility represents the location where you are installing Kolibri, such as a school, training center, or a home.',

        context: 'First paragraph of description of a facility.',
      },
      createNewFacilityAction: {
        message: 'Create a new facility',
        context: 'Option that takes the user to a workflow to create a new facility from scratch.',
      },
      importFacilityAction: {
        message: 'Import all data from an existing facility',
        context:
          'Option that takes the user to a workflow to import a facility and its data from the network or internet',
      },
      importLOD: {
        message: 'Import one or more user accounts from an existing facility',
        context:
          'Option that takes the user to a workflow to import some user accounts from a facility from the network',
      },
      descriptionImportLOD: {
        message: 'This device supports auto-syncing with a full device that has the same facility',
        context:
          "Description of the Learn-only device option. \nLearner account is imported from a facility on a Full device. In this context 'Full' does not refer to storage capacity, but indicates a 'fully featured' device, capable of supporting all users (admins, coaches and learners).",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .p1 {
    margin-top: 0;
  }

  .p2 {
    margin-bottom: 0;
  }

  .left-button {
    margin-left: 0;
  }

  .learn-only-device {
    padding-top: 16px;
  }

</style>
