<template>

  <div class="breadcrumb-wrapper">
    <span v-for="ancestor in contentBreadcrumbs" class="crumb">
      <span v-if="ancestor.vlink">
        <router-link :to="ancestor.vlink">{{ ancestor.title }}</router-link>
      </span>
      <span v-else>{{ ancestor.title }}</span>
    </span>
  </div>

</template>


<script>

  const CoachConstants = require('../../constants');

  module.exports = {
    computed: {
      contentBreadcrumbs() {
        return [
          // link to the root channels page
          {
            title: 'Channels',
            vlink: {
              name: CoachConstants.PageNames.TOPIC_CHANNELS,
              params: {
                classId: this.pageState.classId,
              },
            },
          },
          // links to each ancestor
          ...this.pageState.contentScopeSummary.ancestors.map((item, index) => {
            const breadcrumb = { title: item.title };
            if (index) {
              // links to parent topics
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_ITEM_LIST,
                params: {
                  classId: this.pageState.classId,
                  channelId: this.pageState.channelId,
                  topicId: item.id,
                },
              };
            } else {
              // link to channel root
              breadcrumb.vlink = {
                name: CoachConstants.PageNames.TOPIC_CHANNEL_ROOT,
                params: {
                  classId: this.pageState.classId,
                  channelId: this.pageState.channelId,
                },
              };
            }
            return breadcrumb;
          }),
          // current item
          { title: this.pageState.contentScopeSummary.title }
        ];
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

  @require '~kolibri.styles.definitions'

  .breadcrumb-wrapper
    font-size: smaller
    display: inline-block
    color: $core-text-annotation

  .crumb + .crumb::before // before any crumb coming after another crumb
    content: '>'
    margin: 8px
    color: $core-text-annotation

  .crumb a
    color: $core-text-annotation

</style>
