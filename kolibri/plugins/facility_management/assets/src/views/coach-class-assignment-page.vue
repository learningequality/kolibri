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
    name: 'coachClassAssignmentPage',
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
      pageHeader: "Assign a coach to '{className}'",
      pageSubheader: 'Showing coaches that are not assigned to this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
