import {
  ref,
  computed,
  onBeforeMount,
  onBeforeUnmount,
  getCurrentInstance,
} from 'kolibri.lib.vueCompositionApi';
import { get, set, useIntervalFn } from '@vueuse/core';
import { fetchDynamicAddresses } from './api';

const Stages = Object.freeze({
  PEER_DISCOVERY_STARTED: 'PEER_DISCOVERY_STARTED',
  PEER_DISCOVERY_SUCCESSFUL: 'PEER_DISCOVERY_SUCCESSFUL',
  PEER_DISCOVERY_FAILED: 'PEER_DISCOVERY_FAILED',
});

export default function useDynamicAddresses(props) {
  const { fetchAddressArgs, discoverySpinnerTime } = props;
  const addresses = ref([]);
  const stage = ref('');
  const discoveredAddressesInitiallyFetched = ref(false);
  const $parent = getCurrentInstance().proxy.$parent;

  function parentEmit(event, ...args) {
    $parent.$emit(event, ...args);
  }

  const setStage = newStage => set(stage, newStage);

  function discoverPeers() {
    parentEmit('started_peer_discovery');
    setStage(Stages.PEER_DISCOVERY_STARTED);
    return fetchDynamicAddresses(fetchAddressArgs)
      .then(devices => {
        set(addresses, devices);
        parentEmit('finished_peer_discovery');
        setTimeout(() => {
          setStage(Stages.PEER_DISCOVERY_SUCCESSFUL);
        }, discoverySpinnerTime);
        set(discoveredAddressesInitiallyFetched, true);
      })
      .catch(() => {
        parentEmit('peer_discovery_failed');
        setStage(Stages.PEER_DISCOVERY_FAILED);
      });
  }

  // Start polling
  const pollForPeers = useIntervalFn(
    () => {
      discoverPeers();
    },
    5000,
    false
  );

  onBeforeMount(() => {
    discoverPeers();
    pollForPeers.resume();
  });

  // Stop polling
  onBeforeUnmount(() => {
    pollForPeers.pause();
  });

  const discoveringPeers = computed(() => {
    return get(stage) === Stages.PEER_DISCOVERY_STARTED;
  });

  const discoveryFailed = computed(() => {
    return get(stage) === Stages.PEER_DISCOVERY_FAILED;
  });

  return {
    addresses,
    discoveringPeers,
    discoveryFailed,
    discoveredAddressesInitiallyFetched,
  };
}
