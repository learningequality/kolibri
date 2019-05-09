<template>

  <div class="loading-screen" :style="backgroundStyle">
    <div>
      <KCircularLoader
        type="indeterminate"
        :delay="false"
      />
      <p>{{ $tr('loadingBook') }}</p>
    </div>
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';
  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';

  export default {
    name: 'LoadingScreen',
    components: {
      KCircularLoader,
    },
    mixins: [themeMixin],
    computed: {
      backgroundStyle() {
        return {
          backgroundColor: this.$coreBgLight,
        };
      },
    },
    $trs: {
      loadingBook: 'Loading book',
    },
  };

</script>


<style lang="scss" scoped>

  .loading-screen {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

</style>
