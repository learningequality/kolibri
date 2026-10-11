<template>

  <span class="new-badge">
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
    color: var(--tokens-textInverted);
    background-color: var(--tokens-success);
    border-radius: 2px;

    &::selection {
      color: var(--tokens-text);
    }
  }

</style>
