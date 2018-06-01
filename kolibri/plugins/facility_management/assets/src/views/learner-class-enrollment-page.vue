<template>

  <div>
    <h1>{{ $tr('pageHeader', {className}) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
    <class-enroll-form
      @submit="enrollLearners"
      :facilityUsers="facilityUsers"
      :classUsers="classUsers"
    />
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'kolibri.utils.vuexCompat';
  import { PageNames } from '../constants';
  import { enrollLearnersInClass } from '../state/actions/class';
  import classEnrollForm from './class-enroll-form';

  export default {
    name: 'learnerClassEnrollmentPage',
    components: {
      classEnrollForm,
    },
    computed: {
      ...mapGetters({
        className: state => state.pageState.class.name,
        facilityUsers: state => state.pageState.facilityUsers,
        classUsers: state => state.pageState.classUsers,
      }),
    },
    methods: {
      ...mapActions({
        enrollLearnersInClass,
      }),
      enrollLearners(selectedUsers) {
        // do this in action?
        this.enrollLearnersInClass(selectedUsers).then(() => {
          this.$router.push({ name: PageNames.CLASS_EDIT_MGMT_PAGE });
        });
      },
    },
    $trs: {
      pageHeader: "Enroll learners into '{className}'",
      pageSubheader: 'Only showing learners that are not enrolled in this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
