<template>

  <div>
    <h1>{{ $tr('pageHeader', {className}) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
    <class-enroll-page @submit="assignCoaches" />
  </div>

</template>


<script>

  import classEnrollPage from './class-enroll-page';
  import { PageNames } from '../constants';
  import { assignCoachesToClass } from '../state/actions/class';

  export default {
    name: 'coachClassAssignmentPage',
    components: {
      classEnrollPage,
    },
    computed: {},
    methods: {
      assignCoaches(coaches) {
        this.assignCoachesToClass(coaches).then(() => {
          // do this in action?
          this.$router.push({ name: PageNames.CLASS_EDIT_MGMT_PAGE });
        });
      },
    },
    vuex: {
      getters: {
        className: state => state.pageState.class.name,
      },
      actions: {
        assignCoachesToClass,
      },
    },
    $trs: {
      pageHeader: "Assign a coach to '{className}'",
      pageSubheader: 'Showing coaches that are not assigned to this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
