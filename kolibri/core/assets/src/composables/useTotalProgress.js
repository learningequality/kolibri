import { ref, computed } from 'kolibri.lib.vueCompositionApi';
import { get, set } from '@vueuse/core';
import useUser from 'kolibri.coreVue.composables.useUser';
import { UserProgressResource } from 'kolibri.resources';
import { MaxPointsPerContent } from '../constants';

const totalProgress = ref(null);

export default function useTotalProgress() {
  const totalPoints = computed(() => totalProgress.value * MaxPointsPerContent);

  const fetchPoints = () => {
    const { isUserLoggedIn, currentUserId } = useUser();
    if (get(isUserLoggedIn) && get(totalProgress) === null) {
      UserProgressResource.fetchModel({ id: get(currentUserId) }).then(progress => {
        set(totalProgress, progress.progress);
      });
    }
  };

  const incrementTotalProgress = progress => {
    set(totalProgress, get(totalProgress) + progress);
  };

  return {
    totalProgress,
    totalPoints,
    fetchPoints,
    incrementTotalProgress,
  };
}
