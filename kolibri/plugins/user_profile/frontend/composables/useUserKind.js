import { computed } from 'vue';
import useUser from 'kolibri/composables/useUser';
import { UserKinds } from 'kolibri/constants';

export default function useUserKind() {
  const { isSuperuser, isAdmin, isCoach, isLearner } = useUser();
  const userKind = computed(() => {
    if (isSuperuser.value) return UserKinds.SUPERUSER;
    if (isAdmin.value) return UserKinds.ADMIN;
    if (isCoach.value) return UserKinds.COACH;
    if (isLearner.value) return UserKinds.LEARNER;
    return UserKinds.ANONYMOUS;
  });
  return { userKind };
}
