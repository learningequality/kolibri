import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import { crossComponentTranslator } from 'kolibri.utils.i18n';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';
import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';

export default {
  data() {
    return {
      translator: crossComponentTranslator(UserTypeDisplay),
    };
  },
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
        [UserKinds.SUPERUSER]: this.translator.$tr('superUserLabel'),
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
