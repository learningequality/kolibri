<template>

  <div>

    <page-header :title="title">
      <div slot="icon">
        <mat-svg v-if="isRoot" category="action" name="explore"/>
        <mat-svg v-else category="file" name="folder"/>
      </div>
    </page-header>

    <p class="page-description" v-if="topic.description">
      {{ topic.description }}
    </p>

    <content-card-group-grid :contents="contents" :gen-content-link="genContentLink" v-if="contents.length" />

  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import some from 'lodash/some';
  import forEach from 'lodash/forEach';
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
    computed: {
      title() {
        return this.isRoot ? this.$tr('topics') : this.topic.title;
      },
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
