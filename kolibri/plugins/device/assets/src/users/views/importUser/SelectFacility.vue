<template>

  <ImmersivePage
    :appBarTitle="deviceString('importUserLabel')"
    :primary="false"
    :loading="loading"
    @navIconClick="handleExit"
  >
    <KPageContainer class="device-container">
      <div v-if="!loading">
        <h1>
          {{ header }}
        </h1>
        <!-- TODO: Show "you cannot import from this facility" message -->
        <RadioButtonGroup
          v-if="!loadingNewAddress"
          class="radio-group"
          :items="facilities"
          :currentValue.sync="selectedFacilityId"
          :itemLabel="x => formatNameAndId(x.name, x.id)"
          :itemValue="x => x.id"
        />

        <label class="select-button-label" for="select-address-button">
          {{ $tr('selectDifferentDeviceLabel') }}
        </label>
        <KButton
          id="select-address-button"
          appearance="basic-link"
          :text="getCommonSyncString('addNewAddressAction')"
          @click="showSelectAddressModal = true"
        />

        <SelectDeviceModalGroup
          v-if="showSelectAddressModal"
          @cancel="showSelectAddressModal = false"
          @submit="handleAddressSubmit"
        />
      </div>
      <KCircularLoader v-else />
    </KPageContainer>
    <BottomAppBar>
      <KButton
        :text="coreString('continueAction')"
        :primary="true"
        @click="handleContinue"
      />
    </BottomAppBar>
  </ImmersivePage>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { SelectDeviceModalGroup, RadioButtonGroup } from 'kolibri.coreVue.componentSets.sync';
  import ImmersivePage from 'kolibri.coreVue.components.ImmersivePage';
  import BottomAppBar from 'kolibri.coreVue.components.BottomAppBar';

  import commonDeviceStrings from '../../../views/commonDeviceStrings';

  export default {
    name: 'SelectFacility',
    components: {
      BottomAppBar,
      ImmersivePage,
      RadioButtonGroup,
      SelectDeviceModalGroup,
    },
    inject: ['importUserService'],
    mixins: [commonCoreStrings, commonSyncElements, commonDeviceStrings],
    data() {
      return {
        // Need to initialize to non-empty string to fix #7595
        loading: true,
        selectedFacilityId: 'selectedFacilityId',
        facilities: [],
        device: null,
        loadingNewAddress: false,
        showSelectAddressModal: false,
      };
    },
    computed: {
      header() {
        return this.getCommonSyncString('selectFacilityTitle');
      },
      importDeviceId() {
        return this.importUserService.state.context.importDeviceId;
      },
      selectedFacility() {
        return this.facilities.find(f => f.id === this.selectedFacilityId);
      },
    },
    beforeMount() {
      this.fetchNetworkLocation(this.importDeviceId);
    },
    methods: {
      async fetchNetworkLocation(deviceId) {
        this.loadingNewAddress = true;
        const data = await this.fetchNetworkLocationFacilities(deviceId);
        this.facilities = [...data.facilities];
        this.device = {
          name: data.device_name,
          id: data.device_id,
          baseurl: data.device_address,
        };
        this.selectedFacilityId = this.facilities[0].id;
        if (this.facilities.length === 1) {
          this.handleContinue(); // If we only have one, just move along
        } else {
          this.loading = false;
          this.loadingNewAddress = false;
        }
      },
      handleAddressSubmit(address) {
        this.fetchNetworkLocation(address.id).then(() => (this.showSelectAddressModal = false));
      },
      handleContinue() {
        this.importUserService.send({
          type: 'CONTINUE',
          value: {
            selectedFacility: this.selectedFacility,
            importDevice: this.device,
            facilitiesCount: this.facilities.length,
          },
        });
      },
      handleExit() {
        this.importUserService.send('RESET_IMPORT');
      },
    },
    $trs: {
      selectDifferentDeviceLabel: {
        message: "Don't see your learning facility?",
        context:
          'A label shown above a link that will open a modal to select a different network location from which to select a facility',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .radio-group {
    margin: 1.5em 0;
  }

  .select-button-label {
    display: block;
    margin: 0 0 1em;
  }

</style>
