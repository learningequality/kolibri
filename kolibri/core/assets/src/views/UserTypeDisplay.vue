<template>

  <span
    v-if="typeDisplay"
    class="user-type-display"
  >
    {{ typeDisplay }}
  </span>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import coreStringsMixin from 'kolibri.coreVue.mixins.coreStringsMixin';

  export default {
    name: 'UserTypeDisplay',
    mixins: [coreStringsMixin],
    props: {
      userType: {
        type: String,
        required: false,
      },
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
          [UserKinds.SUPERUSER]: this.$tr('superUserLabel'),
          [UserKinds.ADMIN]: this.$tr('adminLabel'),
          [UserKinds.COACH]: this.distinguishCoachTypes
            ? this.$tr('facilityCoachLabel')
            : this.coreCommon$tr('coachLabel'),
          [UserKinds.ASSIGNABLE_COACH]: this.$tr('coachLabel'),
          [UserKinds.LEARNER]: this.omitLearner ? '' : this.$tr('learnerLabel'),
        };
      },
      typeDisplay() {
        if (this.userType) {
          return this.typeDisplayMap[this.userType];
        }
        return '';
      },
    },
    $trs: {
      superUserLabel: 'Super admin',
      adminLabel: 'Admin',
      facilityCoachLabel: 'Facility coach',
      learnerLabel: 'Learner',
    },
  };

</script>


<style lang="scss" scoped></style>
