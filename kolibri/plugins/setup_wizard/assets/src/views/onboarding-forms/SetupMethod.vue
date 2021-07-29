<template>

  <OnboardingForm
    :header="$tr('setupMethodHeader')"
  >
    <p class="p1">
      {{ $tr('descriptionParagraph1') }}
    </p>
    <p class="p2">
      {{ $tr('descriptionParagraph2') }}
    </p>

    <template #buttons>
      <KButtonGroup>
        <KButton
          class="left-button"
          :text="$tr('createNewFacilityAction')"
          appearance="raised-button"
          primary
          @click="startNewFacilityFlow"
        />
        <KButton
          :text="$tr('importFacilityAction')"
          appearance="flat-button"
          @click="showAddressModal = true"
        />
      </KButtonGroup>
    </template>

    <SelectAddressModalGroup
      v-if="showAddressModal"
      @submit="startFacilityImportFlow"
      @cancel="showAddressModal = false"
    />
  </OnboardingForm>

</template>


<script>

  import { SelectAddressModalGroup } from 'kolibri.coreVue.componentSets.sync';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import OnboardingForm from './OnboardingForm';

  export default {
    name: 'SetupMethod',
    components: {
      OnboardingForm,
      SelectAddressModalGroup,
    },
    mixins: [commonSyncElements],
    data() {
      return {
        showAddressModal: false,
      };
    },
    methods: {
      startNewFacilityFlow() {
        this.$router.push({ path: '/create_facility/1' });
      },
      startFacilityImportFlow(address) {
        this.$router.push({
          path: '/import_facility/1',
          query: {
            device_id: address.id,
          },
        });
      },
    },
    $trs: {
      setupMethodHeader: {
        message: 'Create or import facility',
        context: 'Page title',
      },
      descriptionParagraph1: {
        message:
          'A facility represents the location where you are installing Kolibri, such as a school, training center, or a home.',

        context: 'First paragraph of description',
      },
      descriptionParagraph2: {
        message:
          'You can create a new facility or import an existing facility from another device on your network',

        context: 'Second paragraph of description',
      },
      createNewFacilityAction: {
        message: 'New facility',
        context: 'Button that takes user to a workflow to create a new facility from scratch',
      },
      importFacilityAction: {
        message: 'Import facility',
        context:
          'Button that takes user to a workflow to import a facility and its data from the network or internet',
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

</style>
