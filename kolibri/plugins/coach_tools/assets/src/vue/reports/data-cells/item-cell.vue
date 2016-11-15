<template>

  <div class="wrapper">
    <content-icon :kind="kind" class="icon"></content-icon>
    <a v-if="isTopic" v-link="topicLink">{{ title }}</a>
    <span v-else>{{ title }}</span>
  </div>

</template>


<script>

  const genLink = require('../genLink');
  const Constants = require('../../../state/constants');
  const CoreConstants = require('kolibri.coreVue.vuex.constants');

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
      id: {
        type: String,
        required: true,
      },
    },
    computed: {
      isTopic() {
        return this.kind === CoreConstants.ContentNodeKinds.TOPIC;
      },
      isUser() {
        return this.kind === CoreConstants.USER;
      },
      isContent() {
        return !this.isTopic && !this.isUser;
      },
      topicLink() {
        return genLink(this.pageState, {
          content_scope: Constants.ContentScopes.TOPIC,
          content_scope_id: this.id,
        });
      },
    },
    vuex: {
      getters: {
        pageState: state => state.pageState,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  a
    display: block

  .wrapper
    font-weight: normal
    position: relative
    text-align: left
    padding-left: 20px

  .hasicon
    padding-left: 20px

  .icon
    position: absolute
    left: 0
    top: 2px
    width: 15px
    height: 15px

</style>
