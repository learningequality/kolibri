<template>

  <div class="progress-wrapper">
    <KCircularLoader
      class="loader"
      :size="24"
    />
    <span class="message">{{ $tr('generatingLog') }}</span>
  </div>

</template>


<script>

  import KCircularLoader from 'kolibri.coreVue.components.KCircularLoader';

  export default {
    name: 'DataPageTaskProgress',
    components: {
      KCircularLoader,
    },
    $trs: {
      generatingLog: 'Generating log file...',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .progress-wrapper {
    position: relative;
  }

  .loader {
    display: inline-block;
    position: absolute;
    top: -2px;
  }

  .message {
    margin-left: 30px;
  }

</style>
