<template>

  <div>

    <PageHeader :title="topic.title" />

    <TextTruncator
      v-if="topic.description"
      :text="topic.description"
      :maxHeight="90"
      :showTooltip="false"
      :showViewMore="true"
      dir="auto"
      class="page-description"
    />

    <!--<ContentCardGroupGrid-->
    <!--v-if="contents.length"-->
    <!--:contents="contents"-->
    <!--:genContentLink="genContentLink"-->
    <!--/>-->

    <!--<hr>-->

    <div v-for="child in contents">
      <PageHeader :title="child.title" />
      <ContentCardGroupGrid
        v-if="child.children.length"
        :contents="child.children"
        :genContentLink="genContentLink"
      />
    </div>


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
    name: 'KnowledgeMap',
    $trs: {
      topics: 'Topics',
      navigate: 'Navigate content using headings',
      documentTitleForChannel: 'Topics - { channelTitle }',
      documentTitleForTopic: '{ topicTitle } - { channelTitle }',
    },
    components: {
      PageHeader,
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
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic', 'childrenChildren']),
      channelId() {
        return this.channel.id;
      },
      channelTitle() {
        return this.channel.title;
      },
    },
    methods: {
      genContentLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.KNOWLEDGE_MAP,
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
