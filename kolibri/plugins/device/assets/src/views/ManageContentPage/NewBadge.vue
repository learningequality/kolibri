<template>

  <span
    class="new-badge"
    :style="{ color: $themeTokens.textInverted, backgroundColor: $themeTokens.success }"
  >
    {{ label }}
  </span>

</template>


<script>

  import commonDeviceStrings from '../commonDeviceStrings';

  export default {
    name: 'NewBadge',
    mixins: [commonDeviceStrings],
    props: {
      label: {
        type: String,
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .new-badge {
    padding: 2px 8px;
    font-size: 14px;
    font-weight: bold;
    border-radius: 2px;
  }

</style>
