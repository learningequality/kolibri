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

  export default {
    name: 'UserTypeDisplay',
    $trs: {
      superUserLabel: 'Super admin',
      adminLabel: 'Admin',
      facilityCoachLabel: 'Facility coach',
      coachLabel: 'Coach',
      learnerLabel: 'Learner',
    },
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
            : this.$tr('coachLabel'),
          [UserKinds.ASSIGNABLE_COACH]: this.$tr('coachLabel'),
          [UserKinds.LEARNER]: this.omitLearner ? '' : this.$tr('learnerLabel'),
        };
      },
      typeDisplay() {
        return this.typeDisplayMap[this.userType];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
