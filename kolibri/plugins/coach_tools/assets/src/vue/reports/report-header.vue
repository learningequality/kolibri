<template>

  <h2>
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
  </h2>

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

  h2
    margin: 0 0 15px 0
    font-size: 1.3em

  .icon
    display: inline-block
    position: relative
    top: 3px
    width: 25px
    height: 25px

</style>
