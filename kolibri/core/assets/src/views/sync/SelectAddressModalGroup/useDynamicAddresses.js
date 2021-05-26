import {
  ref,
  computed,
  onBeforeMount,
  onBeforeUnmount,
  getCurrentInstance,
} from '@vue/composition-api';
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
  const intervalId = ref('');
  const discoveredAddressesInitiallyFetched = ref(false);
  const $parent = getCurrentInstance().proxy.$parent;

  function parentEmit(event, ...args) {
    $parent.$emit(event, ...args);
  }

  function discoverPeers() {
    parentEmit('started_peer_discovery');
    stage.value = Stages.PEER_DISCOVERY_STARTED;
    return fetchDynamicAddresses(fetchAddressArgs)
      .then(devices => {
        addresses.value = devices;
        parentEmit('finished_peer_discovery');
        setTimeout(() => {
          stage.value = Stages.PEER_DISCOVERY_SUCCESSFUL;
        }, discoverySpinnerTime);
        discoveredAddressesInitiallyFetched.value = true;
      })
      .catch(() => {
        parentEmit('peer_discovery_failed');
        stage.value = Stages.PEER_DISCOVERY_FAILED;
      });
  }

  // Start polling
  onBeforeMount(() => {
    discoverPeers();
    if (!intervalId.value) {
      intervalId.value = setInterval(discoverPeers, 5000);
    }
  });

  // Stop polling
  onBeforeUnmount(() => {
    if (intervalId.value) {
      intervalId.value = clearInterval(intervalId.value);
    }
  });

  const discoveringPeers = computed(() => {
    return stage.value === Stages.PEER_DISCOVERY_STARTED;
  });

  const discoveryFailed = computed(() => {
    return stage.value === Stages.PEER_DISCOVERY_FAILED;
  });

  return {
    addresses,
    discoveringPeers,
    discoveryFailed,
  };
}
