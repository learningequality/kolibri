import { ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import client from 'kolibri.client';
import urls from 'kolibri.urls';

export default function useIndividualDevice() {
  const isIndividual = ref(false);

  onMounted(() => {
    client({ url: urls['kolibri:kolibri.plugins.user_profile:userindividual']() }).then(
      response => {
        isIndividual.value = response.data.individual && !response.data.lod;
        // isIndividual.value = true;
      }
    );
  });

  return {
    isIndividual,
  };
}
