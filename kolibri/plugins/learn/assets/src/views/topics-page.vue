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

  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import textTruncator from 'kolibri.coreVue.components.textTruncator';
  import { PageNames } from '../constants';
  import pageHeader from './page-header';
  import contentCard from './content-card';
  import contentCardGroupGrid from './content-card-group-grid';

  export default {
    name: 'topicsPage',
    $trs: {
      topics: 'Topics',
      navigate: 'Navigate content using headings',
    },
    components: {
      pageHeader,
      contentCard,
      contentCardGroupGrid,
      textTruncator,
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
    vuex: {
      getters: {
        topic: state => state.pageState.topic,
        contents: state => state.pageState.contents,
        isRoot: state => state.pageState.isRoot,
        channelId: state => state.pageState.channel.id,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  .page-description
    margin-top: 1em
    margin-bottom: 1em
    line-height: 1.5em

</style>
