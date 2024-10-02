import { ref } from 'kolibri.lib.vueCompositionApi';

const connected = ref(true);
const reconnectTime = ref(null);
const reloadOnReconnect = ref(false);

export default function useConnection() {
  return {
    connected,
    reconnectTime,
    reloadOnReconnect,
  };
}
