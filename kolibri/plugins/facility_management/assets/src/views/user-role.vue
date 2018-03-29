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
    name: 'userRole',
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


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  .user-role
    background-color: $core-text-annotation
    color: $core-bg-light
    padding-left: 1em
    padding-right: 1em
    border-radius: 0.5em
    font-size: small
    display: inline-block
    white-space: nowrap

</style>
