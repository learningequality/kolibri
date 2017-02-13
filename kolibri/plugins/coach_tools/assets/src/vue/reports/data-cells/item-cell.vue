<template>

  <div>
    <div class="wrapper">
      <content-icon :kind="kind" class="icon"/>
      <router-link :to="vLink">{{ title }}</router-link>
    </div>
    <div class="wrapper" v-if="isTopic">
      {{ $tr('exercises', {count: exerciseCount}) }} • {{ $tr('contents', {count: contentCount}) }}
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
    components: {
      'content-icon': require('kolibri.coreVue.components.contentIcon'),
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
      exerciseCount: {
        type: Number,
      },
      contentCount: {
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
            all_or_recent: Constants.AllOrRecent.ALL,
            user_scope: Constants.UserScopes.USER,
            user_scope_id: this.id,
          });
        } else if (this.isTopic) {
          return genLink(this.pageState, {
            all_or_recent: Constants.AllOrRecent.ALL,
            content_scope: Constants.ContentScopes.TOPIC,
            content_scope_id: this.id,
          });
        }
        // assume it's a content link
        return genLink(this.pageState, {
          all_or_recent: Constants.AllOrRecent.ALL,
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
