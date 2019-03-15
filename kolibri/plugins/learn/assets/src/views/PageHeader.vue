<template>

  <div dir="auto">
    <h1 class="title">
      {{ title }}
      <ProgressIcon :progress="progress" />
    </h1>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import ProgressIcon from 'kolibri.coreVue.components.ProgressIcon';

  export default {
    name: 'PageHeader',
    components: { ProgressIcon },
    props: { title: { type: String } },
    computed: {
      ...mapState({
        progress: state => {
          if (state.topicsTree.content) {
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
      }),
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    display: inline-block;
  }

</style>
