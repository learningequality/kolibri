<template>

  <div>
    <SelectAddressForm
      v-if="stage === Stages.SELECT_ADDRESS"
      :filterByChannelId="filterByChannelId"
      :filterByFacilityId="filterByFacilityId"
      :selectedId="addedAddressId"
      :formDisabled="$attrs.selectAddressDisabled"
      @click_add_address="goToAddAddress"
      @click_search_address="goToSearchAddress"
      @removed_address="handleRemovedAddress"
      @cancel="handleCancel"
      @submit="handleSelectAddressSubmit"
    />
    <AddAddressForm
      v-if="stage === Stages.ADD_ADDRESS"
      @cancel="goToSelectAddress"
      @added_address="handleAddedAddress"
    />
  </div>

</template>


<script>

  import AddAddressForm from './AddAddressForm';
  import SelectAddressForm from './SelectAddressForm';

  const Stages = Object.freeze({
    ADD_ADDRESS: 'ADD_ADDRESS',
    SELECT_ADDRESS: 'SELECT_ADDRESS',
  });

  export default {
    name: 'SelectAddressModalGroup',
    components: {
      AddAddressForm,
      SelectAddressForm,
    },
    props: {
      // Channel filter only needed on ManageContentPage/SelectNetworkAddressModal
      filterByChannelId: {
        type: String,
        default: null,
      },
      // Facility filter only needed on SyncFacilityModalGroup
      filterByFacilityId: {
        type: String,
        default: null,
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
        this.createSnackbar(this.$tr('addAddressSnackbarText'));
        this.goToSelectAddress();
      },
      handleRemovedAddress() {
        this.createSnackbar(this.$tr('removeAddressSnackbarText'));
      },
      handleSelectAddressSubmit(address) {
        this.$emit('submit', address);
      },
      handleCancel() {
        this.$emit('cancel');
      },
    },
    $trs: {
      addAddressSnackbarText: {
        message: 'Successfully added address',
        context: 'This message appears if a network address has been added correctly.',
      },
      removeAddressSnackbarText: {
        message: 'Successfully removed address',
        context: 'This message appears if a network address has been removed correctly.',
      },
    },
  };

</script>


<style lang="scss" scoped></style>
