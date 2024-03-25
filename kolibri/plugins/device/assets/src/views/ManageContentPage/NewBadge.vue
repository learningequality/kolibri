<template>

  <span
    class="new-badge"
    :class="$computedClass(badgeStyle)"
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
    computed: {
      badgeStyle() {
        return {
          color: this.$themeTokens.textInverted,
          backgroundColor: this.$themeTokens.success,
          '::selection': {
            color: this.$themeTokens.text,
          },
        };
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
