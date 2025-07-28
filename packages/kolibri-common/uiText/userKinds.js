import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import { UserKinds } from 'kolibri/constants';

export const getUserKindDisplayMap = (distinguishCoachTypes = true, omitLearner = false) => {
  const { superAdminLabel$, adminLabel$, facilityCoachLabel$, coachLabel$, learnerLabel$ } =
    coreStrings;
  return {
    [UserKinds.SUPERUSER]: superAdminLabel$(),
    [UserKinds.ADMIN]: adminLabel$(),
    [UserKinds.COACH]: distinguishCoachTypes ? facilityCoachLabel$() : coachLabel$(),
    [UserKinds.ASSIGNABLE_COACH]: coachLabel$(),
    [UserKinds.LEARNER]: omitLearner ? '' : learnerLabel$(),
  };
};

export default {
  props: {
    distinguishCoachTypes: {
      type: Boolean,
      required: false,
      default: true,
    },
    omitLearner: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  computed: {
    typeDisplayMap() {
      return getUserKindDisplayMap(this.distinguishCoachTypes, this.omitLearner);
    },
  },
};
