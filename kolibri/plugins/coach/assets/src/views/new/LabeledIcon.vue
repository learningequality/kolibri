<template>

  <span class="wrapper"><slot></slot> {{ label }}</span>

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

  .wrapper svg {
    position: relative;
    top: 6px;
    width: 16px;
  }

</style>
