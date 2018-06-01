<template>

  <div>
    <h1>{{ $tr('pageHeader', {className}) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
    <class-enroll-form
      @submit="assignCoaches"
      :facilityUsers="facilityUsers"
      :classUsers="classUsers"
    />
  </div>

</template>


<script>

  import { mapGetters, mapActions } from 'kolibri.utils.vuexCompat';
  import { PageNames } from '../constants';
  import { assignCoachesToClass } from '../state/actions/class';
  import classEnrollForm from './class-enroll-form';

  export default {
    name: 'coachClassAssignmentPage',
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
        assignCoachesToClass,
      }),
      assignCoaches(coaches) {
        this.assignCoachesToClass(coaches).then(() => {
          // do this in action?
          this.$router.push({ name: PageNames.CLASS_EDIT_MGMT_PAGE });
        });
      },
    },
    $trs: {
      pageHeader: "Assign a coach to '{className}'",
      pageSubheader: 'Showing coaches that are not assigned to this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
