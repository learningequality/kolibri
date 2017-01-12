<template>

  <div>
    <div class="wrapper">
      <content-icon :kind="kind" class="icon"></content-icon>
      <a v-link="vLink">{{ title }}</a>
    </div>
    <div class="wrapper" v-if="isTopic">
      {{ $tr('exercises', {count: exercisecount}) }} • {{ $tr('contents', {count: contentcount}) }}
    </div>
  </div>

</template>


<script>

  const genLink = require('../genLink');
  const Constants = require('../../../state/constants');
  const CoreConstants = require('kolibri.coreVue.vuex.constants');

  module.exports = {
    $trNameSpace: 'item-name',
    $trs: {
      exercises: '{count, number, integer} {count, plural, one {Exercise} other {Exercises}}',
      contents: '{count, number, integer} {count, plural, one {Resource} other {Resources}}',
    },
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
      exercisecount: {
        type: Number,
      },
      contentcount: {
        type: Number,
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
      vLink() {
        if (this.isUser) {
          return genLink(this.pageState, {
            user_scope: Constants.UserScopes.USER,
            user_scope_id: this.id,
          });
        } else if (this.isTopic) {
          return genLink(this.pageState, {
            content_scope: Constants.ContentScopes.TOPIC,
            content_scope_id: this.id,
          });
        }
        // assume it's a content link
        return genLink(this.pageState, {
          content_scope: Constants.ContentScopes.CONTENT,
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

  @require '~kolibri.styles.coreTheme'

  a
    font-size: 1.15em
    font-weight: bold

  .wrapper
    font-weight: normal
    position: relative
    text-align: left
    padding: 2px 0 0 25px
    color: $core-text-annotation

  .hasicon
    padding-left: 20px

  .icon
    position: absolute
    left: 0
    top: 3px
    width: 15px
    height: 15px
    fill: $core-text-default

</style>
