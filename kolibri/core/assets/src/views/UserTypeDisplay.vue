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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'UserTypeDisplay',
    mixins: [commonCoreStrings],
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
          [UserKinds.ADMIN]: this.coreCommon$tr('adminLabel'),
          [UserKinds.COACH]: this.distinguishCoachTypes
            ? this.coreCommon$tr('facilityCoachLabel')
            : this.coreCommon$tr('coachLabel'),
          [UserKinds.ASSIGNABLE_COACH]: this.coreCommon$tr('coachLabel'),
          [UserKinds.LEARNER]: this.omitLearner ? '' : this.coreCommon$tr('learnerLabel'),
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
      facilityCoachLabel: 'Facility coach',
    },
  };

</script>


<style lang="scss" scoped></style>
