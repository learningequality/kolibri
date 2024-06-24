<template>

  <!-- If we skip this, we don't want any messaging shown around the loader we v-else onto
       so show null and '' wherever if we're loading
  -->
  <OnboardingStepBase
    :title="loading ? '' : header"
    :footerMessageType="loading ? null : footerMessageType"
    :step="loading ? null : 1"
    :steps="loading ? null : 5"
    @continue="handleContinue"
  >
    <div v-if="!loading">
      <!-- TODO: Show "you cannot import from this facility" message -->
      <RadioButtonGroup
        v-if="!loadingNewAddress"
        class="radio-group"
        :items="facilities"
        :currentValue.sync="selectedFacilityId"
        :itemLabel="x => formatNameAndId(x.name, x.id)"
        :itemValue="x => x.id"
        :disabled="formDisabled"
      />

      <label
        class="select-button-label"
        for="select-address-button"
      >
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
  </OnboardingStepBase>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonSyncElements from 'kolibri.coreVue.mixins.commonSyncElements';
  import { SelectDeviceModalGroup, RadioButtonGroup } from 'kolibri.coreVue.componentSets.sync';
  import { FooterMessageTypes } from '../constants';

  import OnboardingStepBase from './OnboardingStepBase';

  export default {
    name: 'SelectFacilityForm',
    components: {
      OnboardingStepBase,
      RadioButtonGroup,
      SelectDeviceModalGroup,
    },
    inject: ['wizardService'],
    mixins: [commonCoreStrings, commonSyncElements],
    data() {
      const footerMessageType = FooterMessageTypes.IMPORT_FACILITY;
      return {
        // Need to initialize to non-empty string to fix #7595
        loading: true,
        footerMessageType,
        selectedFacilityId: 'selectedFacilityId',
        facilities: [],
        device: null,
        formDisabled: false,
        loadingNewAddress: false,
        showSelectAddressModal: false,
      };
    },
    computed: {
      header() {
        return this.getCommonSyncString('selectFacilityTitle');
      },
      importDeviceId() {
        return this.wizardService.state.context.importDeviceId;
      },
      selectedFacility() {
        return this.facilities.find(f => f.id === this.selectedFacilityId);
      },
    },
    beforeMount() {
      this.fetchNetworkLocation(this.importDeviceId);
    },
    methods: {
      fetchNetworkLocation(deviceId) {
        this.loadingNewAddress = true;
        return this.fetchNetworkLocationFacilities(deviceId)
          .then(data => {
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
          })
          .catch(error => {
            // TODO handle disconnected peers error more gracefully
            this.$store.dispatch('showError', error);
          });
      },
      handleAddressSubmit(address) {
        this.fetchNetworkLocation(address.id).then(() => (this.showSelectAddressModal = false));
      },
      handleContinue() {
        this.wizardService.send({
          type: 'CONTINUE',
          value: {
            selectedFacility: this.selectedFacility,
            importDevice: this.device,
            facilitiesCount: this.facilities.length,
          },
        });
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

  .radio-group {
    margin: 1.5em 0;
  }

  .select-button-label {
    display: block;
    margin: 0 0 1em;
  }

</style>
