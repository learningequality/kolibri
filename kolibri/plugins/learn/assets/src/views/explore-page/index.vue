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

    <content-card-grid :contents="contents" :gen-link="genLink" v-if="contents.length" />

  </div>

</template>


<script>

  import { getCurrentChannelObject } from 'kolibri.coreVue.vuex.getters';
  import { PageNames } from '../../constants';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import some from 'lodash/some';
  import forEach from 'lodash/forEach';
  import pageHeader from '../page-header';
  import contentCard from '../content-card';
  import contentCardGrid from '../content-card-grid';
  export default {
    name: 'learnExplore',
    $trs: {
      explore: 'Topics',
      navigate: 'Navigate content using headings',
    },
    components: {
      pageHeader,
      contentCard,
      contentCardGrid,
    },
    computed: {
      title() {
        return this.isRoot ? this.$tr('explore') : this.topic.title;
      },
    },
    methods: {
      genLink(id, kind) {
        if (kind === ContentNodeKinds.TOPIC) {
          return {
            name: PageNames.EXPLORE_TOPIC,
            params: { channel_id: this.channelId, id },
          };
        }
        return {
          name: PageNames.EXPLORE_CONTENT,
          params: { channel_id: this.channelId, id },
        };
      },
    },
    vuex: {
      getters: {
        topic: state => state.pageState.topic,
        contents: state => state.pageState.contents,
        isRoot: state => state.pageState.topic.id === getCurrentChannelObject(state).root_id,
        channelId: state => getCurrentChannelObject(state).id,
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
