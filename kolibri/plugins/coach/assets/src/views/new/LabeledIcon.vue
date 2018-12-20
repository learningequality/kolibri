<template>

  <span><slot class="icon"></slot> {{ label }}</span>

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

  .icon {
    position: relative;
    top: 6px;
    width: 16px;
  }

</style>
