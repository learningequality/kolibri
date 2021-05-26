import { ref, computed, onBeforeMount } from '@vue/composition-api';
import { deleteAddress, fetchStaticAddresses } from './api';

const Stages = Object.freeze({
  FETCHING_ADDRESSES: 'FETCHING_ADDRESSES',
  FETCHING_SUCCESSFUL: 'FETCHING_SUCCESSFUL',
  FETCHING_FAILED: 'FETCHING_FAILED',
  DELETING_ADDRESS: 'DELETING_ADDRESS',
  DELETING_SUCCESSFUL: 'DELETING_SUCCESSFUL',
  DELETING_FAILED: 'DELETING_FAILED',
});

export default function useSavedAddresses(props, context) {
  const addresses = ref([]);
  const stage = ref('');
  const savedAddressesInitiallyFetched = ref(false);

  function removeSavedAddress(id) {
    stage.value = Stages.DELETING_ADDRESS;
    return deleteAddress(id)
      .then(() => {
        addresses.value = addresses.value.filter(a => a.id !== id);
        stage.value = Stages.DELETING_SUCCESSFUL;
        context.emit('removed_address');
      })
      .catch(() => {
        stage.value = Stages.DELETING_FAILED;
      });
  }

  const fetchAddressArgs = computed(() => {
    if (props.filterByChannelId) {
      return { channelId: props.filterByChannelId };
    } else if (props.filterByFacilityId) {
      return { facilityId: props.filterByFacilityId };
    } else {
      return {};
    }
  });

  function refreshSavedAddressList() {
    stage.value = Stages.FETCHING_ADDRESSES;
    addresses.value = [];
    return fetchStaticAddresses(fetchAddressArgs.value)
      .then(addrs => {
        addresses.value = [...addrs];
        stage.value = Stages.FETCHING_SUCCESSFUL;
        savedAddressesInitiallyFetched.value = true;
      })
      .catch(() => {
        stage.value = Stages.FETCHING_FAILED;
      });
  }

  const fetchingAddresses = computed(() => {
    return stage.value === Stages.FETCHING_ADDRESSES;
  });

  const fetchingFailed = computed(() => {
    return stage.value === Stages.FETCHING_FAILED;
  });

  const deletingAddress = computed(() => {
    return stage.value === Stages.DELETING_ADDRESS;
  });

  const deletingFailed = computed(() => {
    return stage.value === Stages.DELETING_FAILED;
  });

  onBeforeMount(() => {
    refreshSavedAddressList();
  });

  const requestsFailed = computed(() => {
    return fetchingFailed.value && deletingFailed.value;
  });

  return {
    addresses,
    removeSavedAddress,
    refreshSavedAddressList,
    fetchingAddresses,
    fetchingFailed,
    deletingAddress,
    deletingFailed,
    requestsFailed,
    savedAddressesInitiallyFetched,
  };
}
