<template>

  <div>
    <SelectAddressForm
      v-if="stage === Stages.SELECT_ADDRESS"
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

  import { mapActions, mapGetters, mapMutations, mapState } from 'vuex';
  import { availableChannelsPageLink, selectContentPageLink } from '../manageContentLinks';
  import AddAddressForm from './AddAddressForm';
  import SelectAddressForm from './SelectAddressForm';

  const Stages = {
    ADD_ADDRESS: 'ADD_ADDRESS',
    SELECT_ADDRESS: 'SELECT_ADDRESS',
  };

  export default {
    name: 'SelectNetworkAddressModal',
    components: {
      AddAddressForm,
      SelectAddressForm,
    },
    props: {
      manageMode: {
        type: Boolean,
        required: false,
      },
    },
    data() {
      return {
        stage: Stages.SELECT_ADDRESS,
        Stages,
      };
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
      ...mapState('manageContent/wizard', ['transferredChannel']),
    },
    methods: {
      ...mapActions(['createSnackbar']),
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
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
        if (this.manageMode) {
          this.$emit('submit', { addressId: address.id });
        } else {
          if (this.isImportingMore) {
            this.$router.push(
              selectContentPageLink({
                addressId: address.id,
                channelId: this.transferredChannel.id,
              })
            );
          } else {
            this.$router.push(availableChannelsPageLink({ addressId: address.id }));
          }
        }
      },
      handleCancel() {
        if (this.manageMode) {
          this.$emit('cancel');
        } else {
          this.resetContentWizardState();
        }
      },
    },
    $trs: {
      addAddressSnackbarText: 'Successfully added address',
      removeAddressSnackbarText: 'Successfully removed address',
    },
  };

</script>


<style lang="scss" scoped></style>
