<template>

  <div>
    <h1>{{ $tr('pageHeader', {className}) }}</h1>
    <p>{{ $tr('pageSubheader') }}</p>
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
      getters: {
        className: state => state.pageState.class.name,
      },
      actions: {},
    },
    $trs: {
      pageHeader: "Enroll learners into '{className}'",
      pageSubheader: 'Only showing learners that are not enrolled in this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
