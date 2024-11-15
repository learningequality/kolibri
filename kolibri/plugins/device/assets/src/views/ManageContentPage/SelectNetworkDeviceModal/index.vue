<template>

  <SelectDeviceModalGroup
    :filterByChannelId="filterByChannelId"
    @cancel="handleCancel"
    @submit="handleSelectAddressSubmit"
  />

</template>


<script>

  import { mapGetters, mapMutations, mapState } from 'vuex';
  import SelectDeviceModalGroup from 'kolibri-common/components/syncComponentSet/SelectDeviceModalGroup';
  import { availableChannelsPageLink, selectContentPageLink } from '../manageContentLinks';

  export default {
    name: 'SelectNetworkDeviceModal',
    components: {
      SelectDeviceModalGroup,
    },
    props: {
      manageMode: {
        type: Boolean,
        required: false,
      },
    },
    data() {
      return {};
    },
    computed: {
      ...mapGetters('manageContent/wizard', ['isImportingMore']),
      ...mapState('manageContent/wizard', ['transferredChannel']),
      filterByChannelId() {
        return this.isImportingMore ? this.transferredChannel.id : '';
      },
    },
    methods: {
      ...mapMutations('manageContent/wizard', {
        resetContentWizardState: 'RESET_STATE',
      }),
      handleSelectAddressSubmit(address) {
        const addressId = address.id;
        if (this.manageMode) {
          this.$emit('submit', { addressId });
        } else {
          if (this.isImportingMore) {
            this.$router.push(
              selectContentPageLink({
                addressId,
                channelId: this.transferredChannel.id,
              }),
            );
          } else {
            this.$router.push(availableChannelsPageLink({ addressId }));
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
  };

</script>


<style lang="scss" scoped></style>
