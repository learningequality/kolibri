<template>

  <span
    class="user-type-display"
    v-if="typeLabel"
  >
    {{ typeLabel }}
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
      /**
       * Roles array, from backend
       **/
      user: {
        type: Object,
        required: true,
        validator(userObject) {
          const requiredFields = [
            'id',
            'username',
            'full_name',
            'is_superuser',
            'roles',
            'facility',
          ];
          return requiredFields.every(field => userObject[field] !== undefined);
        },
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
      kindToLabelMap() {
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
      type() {
        if (this.user.is_superuser) {
          return UserKinds.SUPERUSER;
        }
        if (!this.user.roles.length) {
          return UserKinds.LEARNER;
        }

        // get first role associated with this facility
        return this.user.roles.find(role => role.collection === this.user.facility).kind;
      },
      typeLabel() {
        return this.kindToLabelMap[this.type];
      },
    },
  };

</script>


<style lang="scss" scoped></style>
