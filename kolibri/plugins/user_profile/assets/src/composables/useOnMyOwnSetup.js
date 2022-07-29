import { ref, onMounted } from 'kolibri.lib.vueCompositionApi';
import client from 'kolibri.client';
import urls from 'kolibri.urls';

export default function onMyOwnSetup() {
  const onMyOwnSetup = ref(false);

  onMounted(() => {
    client({ url: urls['kolibri:kolibri.plugins.user_profile:onmyownsetup']() }).then(response => {
      onMyOwnSetup.value = response.data.on_my_own_setup && !response.data.lod;
    });
  });

  return {
    onMyOwnSetup,
  };
}
