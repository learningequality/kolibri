<template>

  <div>
    <SelectDeviceForm
      v-if="stage === Stages.SELECT_ADDRESS"
      :filterByChannelId="filterByChannelId"
      :filterByFacilityId="filterByFacilityId"
      :filterLODAvailable="filterLODAvailable"
      :selectedId="addedAddressId"
      :formDisabled="$attrs.selectAddressDisabled"
      @click_add_address="goToAddAddress"
      @click_search_address="goToSearchAddress"
      @removed_address="handleRemovedAddress"
      @cancel="handleCancel"
      @submit="handleSelectAddressSubmit"
    />
    <AddDeviceForm
      v-if="stage === Stages.ADD_ADDRESS"
      @cancel="goToSelectAddress"
      @added_address="handleAddedAddress"
    />
  </div>

</template>


<script>

  import AddDeviceForm from './AddDeviceForm';
  import SelectDeviceForm from './SelectDeviceForm';

  const Stages = Object.freeze({
    ADD_ADDRESS: 'ADD_ADDRESS',
    SELECT_ADDRESS: 'SELECT_ADDRESS',
  });

  export default {
    name: 'SelectDeviceModalGroup',
    components: {
      AddDeviceForm,
      SelectDeviceForm,
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
    },
    data() {
      return {
        stage: Stages.SELECT_ADDRESS,
        addedAddressId: '',
        Stages,
      };
    },
    methods: {
      createSnackbar(args) {
        this.$store.dispatch('createSnackbar', args);
      },
      goToAddAddress() {
        this.addedAddressId = '';
        this.stage = Stages.ADD_ADDRESS;
      },
      goToSearchAddress() {
        this.stage = Stages.SEARCH_ADDRESS;
      },
      goToSelectAddress() {
        this.stage = Stages.SELECT_ADDRESS;
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
        context: 'This message appears if a network device has been added correctly.',
      },
      removeDeviceSnackbarText: {
        message: 'Successfully removed device',
        context: 'This message appears if a network device has been removed correctly.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
