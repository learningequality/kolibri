<template>

  <div>
    <div class="wrapper">
      <content-icon :kind="kind" class="icon"></content-icon>
      <a v-link="vLink">{{ title }}</a>
    </div>
    <div class="wrapper" v-if="isTopic">
      {{ $tr('exercises', {count: exercisecount}) }} ● {{ $tr('contents', {count: contentcount}) }}
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
      contents: '{count, number, integer} {count, plural, one {Content Item} other {Content Items}}',
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
            view_by_content_or_learners: Constants.ViewBy.CONTENT,
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
          // currently, no table view here so go to the learners table
          view_by_content_or_learners: Constants.ViewBy.LEARNERS,
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
