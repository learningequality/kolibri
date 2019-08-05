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

  import KCircularLoader from 'kolibri.shared.KCircularLoader';

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

  .progress-wrapper {
    position: relative;
  }

  .loader {
    position: absolute;
    top: -2px;
    display: inline-block;
  }

  .message {
    margin-left: 30px;
  }

</style>
