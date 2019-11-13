<template>

  <KModal
    :title="$tr('header')"
    :submitText="coreString('continueAction')"
    :cancelText="coreString('cancelAction')"
    size="medium"
    :submitDisabled="submitDisabled"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <UiAlert
      v-if="uiAlertProps"
      v-show="showUiAlerts"
      :type="uiAlertProps.type"
      :dismissible="false"
    >
      {{ uiAlertProps.text }}
      <KButton
        v-if="requestsFailed"
        appearance="basic-link"
        :text="$tr('refreshAddressesButtonLabel')"
        @click="refreshSavedAddressList"
      />
    </UiAlert>

    <KButton
      v-show="!newAddressButtonDisabled"
      class="new-address-button"
      :text="$tr('newAddressButtonLabel')"
      appearance="basic-link"
      @click="$emit('click_add_address')"
    />

    <template v-for="(a, idx) in savedAddresses">
      <div :key="`div-${idx}`">
        <KRadioButton
          :key="idx"
          v-model="selectedAddressId"
          class="radio-button"
          :value="a.id"
          :label="a.device_name"
          :description="a.base_url"
          :disabled="!a.available || !a.hasContent"
        />
        <KButton
          :key="`forget-${idx}`"
          :text="$tr('forgetAddressButtonLabel')"
          appearance="basic-link"
          @click="removeSavedAddress(a.id)"
        />
      </div>
    </template>

    <hr v-if="discoveredAddresses.length > 0">

    <template v-for="d in discoveredAddresses">
      <div :key="`div-${d.id}`">
        <KRadioButton
          :key="d.id"
          v-model="selectedDeviceId"
          class="radio-button"
          :value="d.id"
          :label="$tr('peerDeviceName', {identifier: d.id})"
          :description="d.base_url"
          :disabled="d.disabled"
        />
      </div>
    </template>

    <template>
      {{ $tr('searchingText') }}
    </template>

  </KModal>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import find from 'lodash/find';
  import UiAlert from 'keen-ui/src/UiAlert';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { deleteAddress, fetchAddresses, fetchDevices } from './api';

  const Stages = {
    FETCHING_ADDRESSES: 'FETCHING_ADDRESSES',
    FETCHING_SUCCESSFUL: 'FETCHING_SUCCESSFUL',
    FETCHING_FAILED: 'FETCHING_FAILED',
    DELETING_ADDRESS: 'DELETING_ADDRESS',
    DELETING_SUCCESSFUL: 'DELETING_SUCCESSFUL',
    DELETING_FAILED: 'DELETING_FAILED',
  };

  export default {
    name: 'SelectAddressForm',
    components: {
      UiAlert,
    },
    mixins: [commonCoreStrings],
    props: {},
    data() {
      return {
        savedAddresses: [],
        discoveredAddresses: [],
        selectedAddressId: '',
        showUiAlerts: false,
        stage: '',
        Stages,
      };
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
      ...mapState('manageContent/wizard', ['transferredChannel']),
      addresses() {
        return this.savedAddresses.concat(this.discoveredAddresses);
      },
      submitDisabled() {
        return (
          this.selectedAddressId === '' ||
          this.stage === this.Stages.FETCHING_ADDRESSES ||
          this.stage === this.Stages.DELETING_ADDRESS
        );
      },
      newAddressButtonDisabled() {
        return this.stage === this.Stages.FETCHING_ADDRESSES;
      },
      requestsSucessful() {
        return (
          this.stage === this.Stages.FETCHING_SUCCESSFUL ||
          this.stage === this.Stages.DELETING_SUCCESSFUL
        );
      },
      requestsFailed() {
        return (
          this.stage === this.Stages.FETCHING_FAILED || this.stage === this.Stages.DELETING_FAILED
        );
      },
      uiAlertProps() {
        if (this.stage === this.Stages.FETCHING_ADDRESSES) {
          return {
            text: this.$tr('fetchingAddressesText'),
            type: 'info',
          };
        }
        if (this.requestsSucessful && this.addresses.length === 0) {
          return {
            text: this.$tr('noAddressText'),
            type: 'info',
          };
        }
        if (this.stage === this.Stages.FETCHING_FAILED) {
          return {
            text: this.$tr('fetchingFailedText'),
            type: 'error',
          };
        }
        if (this.stage === this.Stages.DELETING_FAILED) {
          return {
            text: this.$tr('deletingFailedText'),
            type: 'error',
          };
        }
        return null;
      },
    },
    beforeMount() {
      return this.refreshSavedAddressList();
    },
    mounted() {
      // Wait a little bit of time before showing UI alerts so there is no flash
      // if data comes back quickly
      setTimeout(() => {
        this.showUiAlerts = true;
      }, 100);

      this.startDiscoveryPolling();
    },
    destroyed() {
      this.stopDiscoveryPolling();
    },
    methods: {
      refreshSavedAddressList() {
        this.stage = this.Stages.FETCHING_ADDRESSES;
        this.savedAddresses = [];
        return fetchAddresses(this.isImportingMore ? this.transferredChannel.id : '')
          .then(addresses => {
            this.savedAddresses = addresses;
            this.resetSelectedAddress();
            this.stage = this.Stages.FETCHING_SUCCESSFUL;
          })
          .catch(() => {
            this.stage = this.Stages.FETCHING_FAILED;
          });
      },
      resetSelectedAddress() {
        const availableAddress = find(this.addresses, { available: true });
        if (availableAddress) {
          this.selectedAddressId = availableAddress.id;
        } else {
          this.selectedAddressId = '';
        }
      },
      removeSavedAddress(id) {
        this.stage = this.Stages.DELETING_ADDRESS;
        return deleteAddress(id)
          .then(() => {
            this.savedAddresses = this.savedAddresses.filter(a => a.id !== id);
            this.resetSelectedAddress(this.savedAddresses);
            this.stage = this.Stages.DELETING_SUCCESSFUL;
            this.$emit('removed_address');
          })
          .catch(() => {
            this.stage = this.Stages.DELETING_FAILED;
          });
      },

      discoverPeers() {
        this.$parent.$emit('started_peer_discovery');
        return fetchDevices(this.isImportingMore ? this.transferredChannel.id : '')
          .then(devices => {
            this.$parent.$emit('finished_peer_discovery');
            this.devices = devices;
          })
          .catch(() => {
            this.$parent.$emit('peer_discovery_failed');
          });
      },

      startDiscoveryPolling() {
        if (!this.intervalId) {
          this.intervalId = setInterval(this.discoverPeers, 5000);
        }
      },

      stopDiscoveryPolling() {
        if (this.intervalId) {
          this.intervalId = clearInterval(this.intervalId);
        }
      },

      handleSubmit() {
        if (this.selectedAddressId) {
          this.$emit('submit', find(this.savedAddresses, { id: this.selectedAddressId }));
        }
      },
    },
    $trs: {
      deletingFailedText: 'There was a problem removing this address',
      fetchingAddressesText: 'Looking for available addresses…',
      fetchingFailedText: 'There was a problem getting the available addresses',
      forgetAddressButtonLabel: 'Forget',
      header: 'Select network address',
      newAddressButtonLabel: 'Add new address',
      noAddressText: 'There are no addresses yet',
      refreshAddressesButtonLabel: 'Refresh addresses',
      peerDeviceName: 'Local Kolibri ({ identifier })',
      searchingText: 'Searching...',
    },
  };

</script>


<style lang="scss" scoped>

  .new-address-button {
    margin-bottom: 16px;
  }

  .radio-button {
    display: inline-block;
    width: 75%;
  }

</style>
