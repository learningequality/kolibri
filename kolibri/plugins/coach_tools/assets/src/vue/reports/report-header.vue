<template>

  <h1>
    <span v-if="userFullName">
      <svg src="../icons/user.svg" class="icon"></svg>
      {{ userFullName }} -
    </span>
    <span>
      <content-icon
        :kind="contentKind"
        colorstyle="text-default"
        class="icon"
      ></content-icon>
      {{ contentTitle }}
    </span>
  </h1>

</template>


<script>

  module.exports = {
    props: {
      contentKind: {
        type: String,
        required: true,
      },
      contentTitle: {
        type: String,
        required: true,
      },
      userFullName: {
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
