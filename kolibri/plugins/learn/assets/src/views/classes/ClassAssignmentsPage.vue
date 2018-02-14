<template>

  <div>
    Class Assignments
    <pre>
      {{ JSON.stringify(currentClassroom, null, 2) }}
    </pre>
  </div>

</template>


<script>

  export default {
    components: {},
    computed: {},
    methods: {},
    vuex: {
      getters: {
        currentClassroom: state => state.pageState.currentClassroom,
      },
      actions: {},
    },
    $trs: {},
  };

</script>


<style lang="stylus" scoped></style>
