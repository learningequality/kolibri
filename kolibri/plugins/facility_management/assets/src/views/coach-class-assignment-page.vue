<template>

  <div>
    <class-enroll-page />
  </div>

</template>


<script>

  import classEnrollPage from './class-enroll-page';

  export default {
    name: 'coachClassAssignmentPage',
    components: {
      classEnrollPage,
    },
    computed: {},
    methods: {},
    vuex: {
      getters: {},
      actions: {},
    },
    $trs: {
      pageHeader: "Assign a coach to '{className}'",
      pageSubheader: 'Showing coaches that are not assigned to this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
