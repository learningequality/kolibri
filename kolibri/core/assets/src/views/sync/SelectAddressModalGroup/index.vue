<template>

  <div>
    <SelectAddressForm
      v-if="stage === Stages.SELECT_ADDRESS"
      :fetchAddressArgs="fetchAddressArgs"
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
      fetchAddressArgs: {
        type: String,
        default: '',
      },
    },
    data() {
      return {
        stage: Stages.SELECT_ADDRESS,
        Stages,
      };
    },
    methods: {
      createSnackbar(args) {
        this.$store.dispatch('createSnackbar', args);
      },
      goToAddAddress() {
        this.stage = Stages.ADD_ADDRESS;
      },
      goToSearchAddress() {
        this.stage = Stages.SEARCH_ADDRESS;
      },
      goToSelectAddress() {
        this.stage = Stages.SELECT_ADDRESS;
      },
      handleAddedAddress() {
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
      addAddressSnackbarText: 'Successfully added address',
      removeAddressSnackbarText: 'Successfully removed address',
    },
  };

</script>


<style lang="scss" scoped></style>
