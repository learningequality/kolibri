import { ref } from 'kolibri.lib.vueCompositionApi';
import Vue from 'vue';
import VueCompositionApi from '@vue/composition-api';

Vue.use(VueCompositionApi);

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
