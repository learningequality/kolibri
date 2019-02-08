<template>

  <div>

    <PageHeader :title="topic.title" :progress="progress" />

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
      {{ hidden }}
      <PageHeader :title="child.title" :progress="child.progress" @click.native="hidden = !hidden" />
      <!--<UiIconButton-->
      <!--size="small"-->
      <!--type="secondary"-->
      <!--@click="hidden = !hidden"-->
      <!--&gt;-->
      <!--<mat-svg v-if="hidden" name="expand_less" category="navigation" />-->
      <!--<mat-svg v-else name="expand_more" category="navigation" />-->
      <!--</UiIconButton>-->
      <ContentCardGroupGrid
        v-if="child.children.length && hidden"
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
      ...mapState('topicsTree', ['channel', 'contents', 'isRoot', 'topic', 'progress']),
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
    data: function() {
      return {
        hidden: false,
      };
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
