<template>

  <div class="wrapper" :class="{ hasicon: isContent }">
    <content-icon v-if="isContent" :kind="kind" class="icon"></content-icon>
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
    computed: {
      isContent() {
        return this.kind !== 'user';
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .wrapper
    position: relative
    text-align: left

  .hasicon
    padding-left: 40px

  .icon
    position: absolute
    left: 0
    top: -5px
    width: 30px
    height: 30px

</style>
