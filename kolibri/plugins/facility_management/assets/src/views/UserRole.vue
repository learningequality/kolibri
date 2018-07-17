<template>

  <span class="user-role" v-if="!hidden">{{ text }}</span>

</template>


<script>

  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import values from 'lodash/values';

  const roleToLabelMap = {
    [UserKinds.ADMIN]: 'admin',
    [UserKinds.COACH]: 'facilityCoachRoleLabel',
    [UserKinds.LEARNER]: 'learner',
    [UserKinds.ASSIGNABLE_COACH]: 'coach',
  };

  export default {
    name: 'UserRole',
    $trs: {
      admin: 'Admin',
      facilityCoachRoleLabel: 'Facility coach',
      coach: 'Coach',
      learner: 'Learner',
    },
    props: {
      role: {
        type: String,
        required: true,
        validator(value) {
          return values(UserKinds).includes(value);
        },
      },
      omitLearner: {
        type: Boolean,
        default: false,
      },
    },
    computed: {
      text() {
        const label = roleToLabelMap[this.role];
        return label ? this.$tr(label) : '';
      },
      hidden() {
        return this.role === UserKinds.LEARNER && this.omitLearner;
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .user-role {
    display: inline-block;
    padding-right: 1em;
    padding-left: 1em;
    font-size: small;
    color: $core-bg-light;
    white-space: nowrap;
    background-color: $core-text-annotation;
    border-radius: 0.5em;
  }

</style>
