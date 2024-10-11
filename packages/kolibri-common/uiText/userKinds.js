import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
import { UserKinds } from 'kolibri/constants';

export default {
  mixins: [commonCoreStrings],
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
      return {
        [UserKinds.SUPERUSER]: this.coreString('superAdminLabel'),
        [UserKinds.ADMIN]: this.coreString('adminLabel'),
        [UserKinds.COACH]: this.distinguishCoachTypes
          ? this.coreString('facilityCoachLabel')
          : this.coreString('coachLabel'),
        [UserKinds.ASSIGNABLE_COACH]: this.coreString('coachLabel'),
        [UserKinds.LEARNER]: this.omitLearner ? '' : this.coreString('learnerLabel'),
      };
    },
  },
};
