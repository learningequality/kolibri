<template>

  <div>
    <div class="title">
      {{ $tr('learnOnlyDeviceLabel') }}
    </div>
    <div class="notice">
      {{ $tr('learnOnlyDeviceNotice') }}
    </div>
  </div>

</template>


<script>

  export default {
    name: 'LearnOnlyDeviceNotice',
    $trs: {
      learnOnlyDeviceLabel: {
        message: 'Learn-only device',
        context: 'Label indicating that the device is only usable by learners',
      },
      learnOnlyDeviceNotice: {
        message: 'Coach and admin features not avaiable',
        context: 'A short sentence explaining the limitations of a learn-only device.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .title {
    font-size: small;
    font-weight: bold;
  }
  .notice {
    font-size: 14px;
    font-weight: normal;
  }

</style>
