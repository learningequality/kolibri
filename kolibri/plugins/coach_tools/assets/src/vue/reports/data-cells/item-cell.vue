<template>

  <div class="wrapper">
    <content-icon :kind="kind" class="icon"></content-icon>
    <div class="title">{{ title }}</div>
  </div>

</template>


<script>

  // const ContentKinds = require('kolibri.coreVue.vuex.constants').ContentKinds;

  module.exports = {
    $trNameSpace: 'item-name',
    $trs: {},
    props: {
      kind: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
    },
    computed: {},
  };

</script>


<style lang="stylus" scoped>

  .wrapper
    position: relative
    padding-left: 40px
    text-align: left

  .icon
    position: absolute
    left: 0
    top: -5px
    width: 30px
    height: 30px

</style>
