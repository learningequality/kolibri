import { mapGetters } from 'vuex';
import { UserKinds } from 'kolibri.coreVue.vuex.constants';

export default {
  computed: {
    ...mapGetters([
      'isUserLoggedIn',
      'isSuperuser',
      'isAdmin',
      'isCoach',
      'isLearner',
      'canManageContent',
    ]),
  },
  methods: {
    filterByRole(navItem) {
      if (!navItem.role) {
        // No role defined, so always show
        return true;
      }
      if (navItem.role === UserKinds.COACH) {
        return this.isCoach || this.isAdmin || this.isSuperuser;
      }
      if (navItem.role === UserKinds.ADMIN) {
        return this.isAdmin || this.isSuperuser;
      }
      if (navItem.role === UserKinds.CAN_MANAGE_CONTENT) {
        return this.canManageContent || this.isSuperuser;
      }
      if (navItem.role === UserKinds.SUPERUSER) {
        return this.isSuperuser;
      }
      if (navItem.role === UserKinds.ANONYMOUS) {
        return !this.isUserLoggedIn;
      }
      if (navItem.role === UserKinds.LEARNER) {
        return this.isLearner || this.isCoach || this.isAdmin || this.isSuperuser;
      }
    },
  },
};
