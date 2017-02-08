<template>

  <h2>
    <span v-if="userFullName">
      <mat-svg category="social" name="person"/>
      {{ userFullName }} -
    </span>
    <content-icon
      :kind="contentKind"
      colorstyle="text-default"/>
    {{ contentTitle }}
  </h2>

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

  h2
    margin: 0
    margin-bottom: 15px
    font-size: 1.3em

</style>
