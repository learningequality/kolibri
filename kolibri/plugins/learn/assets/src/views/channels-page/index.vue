<template>

  <div>

    <page-header :title="$tr('channels')">
      <div slot="icon">
        <mat-svg category="navigation" name="apps"/>
      </div>
    </page-header>

    <content-card-group-grid
      :contents="channels"
      :genContentLink="genChannelLink"
      v-if="channels.length"
      :showContentKindFilter="false"
    />

  </div>

</template>


<script>

  import { PageNames } from '../../constants';
  import pageHeader from '../page-header';
  import contentCardGroupGrid from '../content-card-group-grid';
  export default {
    name: 'learnChannels',
    $trs: {
      channels: 'Channels',
    },
    components: {
      pageHeader,
      contentCardGroupGrid,
    },
    methods: {
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
    },
    vuex: {
      getters: {
        channels: state => state.pageState.rootNodes,
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
