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
          [UserKinds.ADMIN]: this.coreString('adminLabel'),
          [UserKinds.COACH]: this.distinguishCoachTypes
            ? this.coreString('facilityCoachLabel')
            : this.coreString('coachLabel'),
          [UserKinds.ASSIGNABLE_COACH]: this.coreString('coachLabel'),
          [UserKinds.LEARNER]: this.omitLearner ? '' : this.coreString('learnerLabel'),
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
    },
  };

</script>


<style lang="scss" scoped></style>
