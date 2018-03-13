<template>

  <div>

    <page-header :title="topic.title" />

    <p
      v-if="topic.description"
      dir="auto"
      class="page-description ta-l"
    >
      {{ topic.description }}
    </p>

    <content-card-group-grid
      v-if="contents.length"
      :contents="contents"
      :genContentLink="genContentLink"
      :showContentKindFilter="false"
    />

  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import pageHeader from '../page-header';
  import contentCard from '../content-card';
  import contentCardGroupGrid from '../content-card-group-grid';
  export default {
    name: 'learnTopics',
    $trs: {
      topics: 'Topics',
      navigate: 'Navigate content using headings',
    },
    components: {
      pageHeader,
      contentCard,
      contentCardGroupGrid,
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

  .ta-l
    text-align: left

</style>
