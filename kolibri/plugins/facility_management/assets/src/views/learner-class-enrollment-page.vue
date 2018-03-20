<template>

  <div>
    <h1>{{ $tr('pageHeader', {className}) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
    <class-enroll-page @submit="enrollLearners" />
  </div>

</template>


<script>

  import classEnrollPage from './class-enroll-page';
  import { PageNames } from '../constants';
  import { enrollUsersInClass } from '../state/actions';

  export default {
    name: 'learnerClassEnrollmentPage',
    components: {
      classEnrollPage,
    },
    computed: {},
    methods: {
      enrollLearners(selectedUsers) {
        this.enrollUsersInClass(selectedUsers).then(() => {
          this.$router.push({ name: PageNames.CLASS_EDIT_MGMT_PAGE });
        });
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
      },
      actions: {
        enrollUsersInClass,
      },
    },
    $trs: {
      pageHeader: "Enroll learners into '{className}'",
      pageSubheader: 'Only showing learners that are not enrolled in this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
