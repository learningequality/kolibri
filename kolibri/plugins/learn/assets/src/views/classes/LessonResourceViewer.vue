<template>

  <div>
    <h1>Current</h1>
    <pre>
      {{ JSON.stringify(currentLessonResource, null, 2) }}
    </pre>
    <h1>NExt</h1>
    <pre>
      {{ JSON.stringify(nextLessonResource, null, 2) }}
    </pre>
  </div>

</template>


<script>

  export default {
    components: {},
    props: {},
    computed: {},
    methods: {},
    vuex: {
      getters: {
        currentLesson: state => state.pageState.currentLesson,
        currentLessonResource: state => state.pageState.currentLessonResource,
        nextLessonResource: state => state.pageState.nextLessonResource,
      },
      actions: {},
    },
    $trs: {},
  };

</script>


<style lang="stylus" scoped>

</style>
