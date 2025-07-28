<template>

  <ImmersivePage
    :appBarTitle="importUserLabel$()"
    :primary="false"
    :loading="loading"
    @navIconClick="importLodMachineService.send('RESET_IMPORT')"
  >
    <KPageContainer class="device-container">
      <div v-if="!loading">
        <h1>
          {{ getCommonSyncString('selectFacilityTitle') }}
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

        <label
          class="select-button-label"
          for="select-address-button"
        >
          {{ selectDifferentDeviceLabel$() }}
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
      <BottomAppBar>
        <KButton
          :text="continueAction$()"
          :primary="true"
          :disabled="loading || !selectedFacility"
          @click="handleContinue"
        />
      </BottomAppBar>
    </KPageContainer>
  </ImmersivePage>

</template>


<script>

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import commonSyncElements from 'kolibri-common/mixins/commonSyncElements';
  import SelectDeviceModalGroup from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup';
  import RadioButtonGroup from 'kolibri-common/components/syncComponentSet/RadioButtonGroup';
  import { lodUsersManagementStrings } from 'kolibri-common/strings/lodUsersManagementStrings';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import BottomAppBar from 'kolibri/components/BottomAppBar';

  import { injectLodDeviceUsers } from '../composables/useLodDeviceUsers';

  export default {
    name: 'SelectFacility',
    components: {
      BottomAppBar,
      ImmersivePage,
      RadioButtonGroup,
      SelectDeviceModalGroup,
    },
    mixins: [commonSyncElements],
    setup() {
      const { importDeviceId, importLodMachineService } = injectLodDeviceUsers();

      const { continueAction$ } = coreStrings;
      const { importUserLabel$, selectDifferentDeviceLabel$ } = lodUsersManagementStrings;

      return {
        importDeviceId,
        importLodMachineService,
        continueAction$,
        importUserLabel$,
        selectDifferentDeviceLabel$,
      };
    },
    data() {
      return {
        loading: true,
        selectedFacilityId: 'selectedFacilityId',
        facilities: [],
        device: null,
        loadingNewAddress: false,
        showSelectAddressModal: false,
      };
    },
    computed: {
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
          this.$store.dispatch('notLoading');
          this.loadingNewAddress = false;
        }
      },
      handleAddressSubmit(address) {
        this.fetchNetworkLocation(address.id).then(() => (this.showSelectAddressModal = false));
      },
      handleContinue() {
        this.importLodMachineService.send({
          type: 'CONTINUE',
          value: {
            selectedFacility: this.selectedFacility,
            importDevice: this.device,
            facilitiesCount: this.facilities.length,
          },
        });
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
