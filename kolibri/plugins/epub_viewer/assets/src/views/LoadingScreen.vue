<template>

  <div class="loading-screen" :style="backgroundStyle">
    <div class="loading-status">
      <KCircularLoader
        type="indeterminate"
        :delay="false"
      />
      <p>{{ $tr('loadingBook') }}</p>
    </div>
  </div>

</template>


<script>

  export default {
    name: 'LoadingScreen',
    computed: {
      backgroundStyle() {
        return {
          backgroundColor: this.$themeTokens.surface,
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
    z-index: 3;
  }

  .loading-status {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

</style>
