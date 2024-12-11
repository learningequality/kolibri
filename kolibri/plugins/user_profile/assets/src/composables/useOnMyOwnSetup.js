import { get } from '@vueuse/core';
import { ref, onMounted } from 'vue';
import useUser from 'kolibri/composables/useUser';
import client from 'kolibri/client';
import urls from 'kolibri/urls';

export default function onMyOwnSetup() {
  const onMyOwnSetup = ref(false);
  const { isLearnerOnlyImport } = useUser();

  onMounted(() => {
    client({ url: urls['kolibri:kolibri.plugins.user_profile:onmyownsetup']() }).then(response => {
      onMyOwnSetup.value = response.data.on_my_own_setup && !get(isLearnerOnlyImport);
    });
  });

  return {
    onMyOwnSetup,
  };
}
