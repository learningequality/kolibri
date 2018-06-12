<template>

  <div dir="auto">
    <h1 class="title">
      {{ title }}
      <progress-icon :progress="progress" />
    </h1>
  </div>

</template>


<script>

  import progressIcon from 'kolibri.coreVue.components.progressIcon';

  export default {
    name: 'pageHeader',
    components: { progressIcon },
    props: { title: { type: String } },
    vuex: {
      getters: {
        progress: state => {
          if (state.pageState.content) {
            if (
              state.core.logging.mastery.totalattempts > 0 &&
              state.core.logging.summary.progress === 0
            ) {
              return 0.1;
            }
            return state.core.logging.summary.progress;
          }
          return null;
        },
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .title
    display: inline-block

</style>
