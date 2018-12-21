<template>

  <span class="wrapper">
    <slot></slot>
    <span class="label">{{ label }}</span>
  </span>

</template>


<script>

  export default {
    name: 'LabeledIcon',
    components: {},
    props: {
      label: {
        type: [String, Number],
        required: true,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .wrapper {
    position: relative;
  }

  .label {
    margin-left: 20px;
  }

  .wrapper svg {
    position: absolute;
    top: 0;
    width: 16px;
  }

</style>
