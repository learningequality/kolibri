import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
import { createTranslator } from 'kolibri.utils.i18n';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';

export default {
  data() {
    return {
      translator: createTranslator('UserTypeDisplay', {
        /* eslint-disable kolibri/vue-no-unused-translations */
        superUserLabel: {
          message: 'Super admin',
          context:
            'An account type that can manage the device. Super admin accounts also have permission to do everything that admins, coaches, and learners can do.',
        },
        /* eslint-enable */
      }),
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
