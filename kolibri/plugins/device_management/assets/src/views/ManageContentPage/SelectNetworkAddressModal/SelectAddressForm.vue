<template>

  <KModal
    :title="$tr('header')"
    :submitText="coreCommon$tr('continueAction')"
    :cancelText="coreCommon$tr('cancelAction')"
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
        @click="refreshAddressList"
      />
    </UiAlert>

    <KButton
      v-show="!newAddressButtonDisabled"
      class="new-address-button"
      :text="$tr('newAddressButtonLabel')"
      appearance="basic-link"
      @click="$emit('click_add_address')"
    />

    <template v-for="(a, idx) in addresses">
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
          @click="removeAddress(a.id)"
        />
      </div>
    </template>
  </KModal>

</template>


<script>

  import { mapGetters, mapState } from 'vuex';
  import find from 'lodash/find';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KModal from 'kolibri.coreVue.components.KModal';
  import KRadioButton from 'kolibri.coreVue.components.KRadioButton';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { coreStringsMixin } from 'kolibri.coreVue.mixins.coreStringsMixin';
  import { deleteAddress, fetchAddresses } from './api';

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
      KButton,
      KModal,
      KRadioButton,
      UiAlert,
    },
    mixins: [coreStringsMixin],
    props: {},
    data() {
      return {
        addresses: [],
        selectedAddressId: '',
        showUiAlerts: false,
        stage: '',
        Stages,
      };
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
      ...mapState('manageContent/wizard', ['transferredChannel']),
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
      return this.refreshAddressList();
    },
    mounted() {
      // Wait a little bit of time before showing UI alerts so there is no flash
      // if data comes back quickly
      setTimeout(() => {
        this.showUiAlerts = true;
      }, 100);
    },
    methods: {
      refreshAddressList() {
        this.stage = this.Stages.FETCHING_ADDRESSES;
        this.addresses = [];
        return fetchAddresses(this.isImportingMore ? this.transferredChannel.id : '')
          .then(addresses => {
            this.addresses = addresses;
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
      removeAddress(id) {
        this.stage = this.Stages.DELETING_ADDRESS;
        return deleteAddress(id)
          .then(() => {
            this.addresses = this.addresses.filter(a => a.id !== id);
            this.resetSelectedAddress(this.addresses);
            this.stage = this.Stages.DELETING_SUCCESSFUL;
            this.$emit('removed_address');
          })
          .catch(() => {
            this.stage = this.Stages.DELETING_FAILED;
          });
      },
      handleSubmit() {
        if (this.selectedAddressId) {
          this.$emit('submit', find(this.addresses, { id: this.selectedAddressId }));
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
