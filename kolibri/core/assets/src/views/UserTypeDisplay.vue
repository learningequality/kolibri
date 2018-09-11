<template>

  <span
    class="user-type-display"
    v-if="typeDisplay"
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
        required: true,
      },
      distinguishCoachTypes: {
        type: Boolean,
        required: false,
        default: true,
      },
      displayLearner: {
        type: Boolean,
        required: false,
        default: true,
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
          [UserKinds.LEARNER]: this.displayLearner ? this.$tr('learnerLabel') : '',
        };
      },
      typeDisplay() {
        return this.typeDisplayMap[this.userType];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
