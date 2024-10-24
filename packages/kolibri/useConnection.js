import { ref } from '@vue/composition-api';

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
