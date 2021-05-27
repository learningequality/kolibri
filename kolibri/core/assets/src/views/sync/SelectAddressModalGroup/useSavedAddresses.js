import { ref, computed, onBeforeMount } from '@vue/composition-api';
import { get, set, and } from '@vueuse/core';
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

  function updateStage(newStage) {
    set(stage, newStage);
  }

  function removeSavedAddress(id) {
    updateStage(Stages.DELETING_ADDRESS);
    return deleteAddress(id)
      .then(() => {
        set(
          addresses,
          get(addresses).filter(a => a.id !== id)
        );
        updateStage(Stages.DELETING_SUCCESSFUL);
        context.emit('removed_address');
      })
      .catch(() => {
        set(stage, Stages.DELETING_FAILED);
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
    updateStage(Stages.FETCHING_ADDRESSES);
    set(addresses, []);
    return fetchStaticAddresses(get(fetchAddressArgs))
      .then(addrs => {
        set(addresses, [...addrs]);
        updateStage(Stages.FETCHING_SUCCESSFUL);
        set(savedAddressesInitiallyFetched, true);
      })
      .catch(() => {
        updateStage(Stages.FETCHING_FAILED);
      });
  }

  const fetchingAddresses = computed(() => {
    return get(stage) === Stages.FETCHING_ADDRESSES;
  });

  const fetchingFailed = computed(() => {
    return get(stage) === Stages.FETCHING_FAILED;
  });

  const deletingAddress = computed(() => {
    return get(stage) === Stages.DELETING_ADDRESS;
  });

  const deletingFailed = computed(() => {
    return get(stage) === Stages.DELETING_FAILED;
  });

  onBeforeMount(() => {
    refreshSavedAddressList();
  });

  const requestsFailed = computed(() => {
    return and(fetchingFailed, deletingFailed);
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
