<template>

  <div>
    <AddDeviceForm
      v-if="addingAddress"
      @cancel="goToSelectAddress"
      @added_address="handleAddedAddress"
    />
    <SelectDeviceForm
      v-else
      :filterByChannelId="filterByChannelId"
      :filterByFacilityId="filterByFacilityId"
      :filterLODAvailable="filterLODAvailable"
      :filterByFacilityCanSignUp="filterByFacilityCanSignUp"
      :filterByOnMyOwnFacility="filterByOnMyOwnFacility"
      :filterByHasFacilities="filterByHasFacilities"
      :selectedId="addedAddressId"
      :formDisabled="$attrs.selectAddressDisabled"
      @click_add_address="goToAddAddress"
      @removed_address="handleRemovedAddress"
      @cancel="handleCancel"
      @submit="handleSelectAddressSubmit"
    />
  </div>

</template>


<script>

  import useSnackbar from 'kolibri/composables/useSnackbar';
  import AddDeviceForm from './AddDeviceForm';
  import SelectDeviceForm from './SelectDeviceForm';

  export default {
    name: 'SelectDeviceModalGroup',
    components: {
      AddDeviceForm,
      SelectDeviceForm,
    },
    setup() {
      const { createSnackbar } = useSnackbar();
      return { createSnackbar };
    },
    props: {
      // Channel filter only needed on ManageContentPage/SelectNetworkDeviceModal
      filterByChannelId: {
        type: String,
        default: null,
      },
      // Facility filter only needed on SyncFacilityModalGroup
      filterByFacilityId: {
        type: String,
        default: null,
      },
      filterLODAvailable: {
        type: Boolean,
        default: false,
      },
      // When looking for devices for which a learner can sign up
      filterByFacilityCanSignUp: {
        type: Boolean,
        default: null,
      },
      filterByHasFacilities: {
        type: Boolean,
        default: null,
      },
      // When looking for facilities to import in the setup wizard
      filterByOnMyOwnFacility: {
        type: Boolean,
        default: null,
      },
    },
    data() {
      return {
        addingAddress: false,
        addedAddressId: '',
      };
    },
    methods: {
      goToAddAddress() {
        this.addedAddressId = '';
        this.addingAddress = true;
      },
      goToSelectAddress() {
        this.addingAddress = false;
      },
      handleAddedAddress(addressId) {
        this.addedAddressId = addressId;
        this.createSnackbar(this.$tr('addDeviceSnackbarText'));
        this.goToSelectAddress();
      },
      handleRemovedAddress() {
        this.createSnackbar(this.$tr('removeDeviceSnackbarText'));
      },
      handleSelectAddressSubmit(address) {
        this.$emit('submit', address);
      },
      handleCancel() {
        this.$emit('cancel');
      },
    },
    $trs: {
      addDeviceSnackbarText: {
        message: 'Successfully added device',
        context: 'This message appears if a device has been added correctly.',
      },
      removeDeviceSnackbarText: {
        message: 'Successfully removed device',
        context: 'This message appears if a device has been removed correctly.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
