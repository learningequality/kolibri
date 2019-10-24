<template>

  <div>

    <PageHeader
      :title="topic.title"
      :progress="calculateProgress"
      contentType="topic"
    />

    <TextTruncator
      v-if="topic.description"
      :text="topic.description"
      :maxHeight="90"
      :showTooltip="false"
      :showViewMore="true"
      dir="auto"
      class="page-description"
    />

    <ContentCardGroupGrid
      v-if="contents.length"
      :contents="contents"
      :genContentLink="genContentLink"
    />

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import TextTruncator from 'kolibri.coreVue.components.TextTruncator';
  import { PageNames } from '../constants';
  import PageHeader from './PageHeader';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'TopicsPage',
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
    components: {
      PageHeader,
      ContentCardGroupGrid,
      TextTruncator,
    },
    computed: {
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic']),
      channelTitle() {
        return this.channel.title;
      },
      calculateProgress() {
        // calculate progress across all topics
        const contentsLength = this.contents.length;
        if (contentsLength !== 0) {
          const computedSum =
            this.contents.map(content => content.progress).reduce((acc, val) => acc + val) /
            contentsLength;
          return computedSum !== 0 ? computedSum : undefined;
        }

        return undefined;
      },
    },
    methods: {
      genContentLink(id, kind) {
        const routeName =
          kind === ContentNodeKinds.TOPIC ? PageNames.TOPICS_TOPIC : PageNames.TOPICS_CONTENT;
        return {
          name: routeName,
          params: { id },
        };
      },
    },
    $trs: {
      documentTitleForChannel: 'Topics - { channelTitle }',
      documentTitleForTopic: '{ topicTitle } - { channelTitle }',
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
