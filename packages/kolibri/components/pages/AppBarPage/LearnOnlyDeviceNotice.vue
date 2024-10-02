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
        context:
          'Designation for a type of Kolibri device used by learners that will not have options and features used by coaches or admins.',
      },
      learnOnlyDeviceNotice: {
        message: 'Coach and admin features not available',
        context: 'A short sentence explaining the limitations of a Learn-only device.',
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
