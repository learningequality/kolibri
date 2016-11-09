<template>

  <h1>
    <span v-if="userfullname">
      <svg src="../icons/user.svg" class="icon"></svg>
      {{ userfullname }} -
    </span>
    <span>
      <content-icon
        :kind="contentkind"
        colorstyle="text-default"
        class="icon"
      ></content-icon>
      {{ contenttitle }}
    </span>
  </h1>

</template>


<script>

  module.exports = {
    props: {
      contentkind: {
        type: String,
        required: true,
      },
      contenttitle: {
        type: String,
        required: true,
      },
      userfullname: {
        type: String,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .icon
    display: inline-block
    position: relative
    top: 5px
    width: 25px
    height: 25px

</style>
