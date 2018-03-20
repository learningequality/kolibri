<template>

  <div>
    <class-enroll-page />
  </div>

</template>


<script>

  import classEnrollPage from './class-enroll-page';

  export default {
    name: 'learnerClassEnrollmentPage',
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
      pageHeader: "Enroll learners into '{className}'",
      pageSubheader: 'Only showing learners that are not enrolled in this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
