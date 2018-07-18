<template>

  <div>

    <page-header :title="topic.title" />

    <text-truncator
      v-if="topic.description"
      :text="topic.description"
      :maxHeight="50"
      :showTooltip="false"
      :showViewMore="true"
      dir="auto"
      class="page-description"
    />

    <content-card-group-grid
      v-if="contents.length"
      :contents="contents"
      :genContentLink="genContentLink"
      :showContentKindFilter="false"
    />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { PageNames } from '../constants';
  import PageHeader from './PageHeader';
  import ContentCard from './ContentCard';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'TopicsPage',
    $trs: {
      topics: 'Topics',
      navigate: 'Navigate content using headings',
      documentTitleForChannel: 'Topics - { channelTitle }',
      documentTitleForTopic: '{ topicTitle } - { channelTitle }',
    },
    components: {
      PageHeader,
      ContentCard,
      ContentCardGroupGrid,
      TextTruncator,
    },
    metaInfo() {
      let title;
      if (this.isRoot) {
        title = this.$tr('documentTitleForChannel', {
          channelTitle: this.channelTitle,
        });
      } else {
        title = this.$tr('documentTitleForTopic', {
          channelTitle: this.channelTitle,
          topicTitle: this.topic.title,
        });
      }
      return { title };
    },
    computed: {
      ...mapState({
        topic: state => state.pageState.topic,
        contents: state => state.pageState.contents,
        isRoot: state => state.pageState.isRoot,
        channelId: state => state.pageState.channel.id,
        channelTitle: state => state.pageState.channel.title,
      }),
    },
    methods: {
      genContentLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.TOPICS_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.TOPICS_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .page-description {
    margin-top: 1em;
    margin-bottom: 1em;
    line-height: 1.5em;
  }

</style>
