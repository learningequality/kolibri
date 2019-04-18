<template>

  <div>
    <PageHeader
      :title="$tr('channels')"
      class="visuallyhidden"
    />
    <ContentCardGroupGrid
      v-if="channels.length"
      class="grid"
      :contents="channels"
      :genContentLink="genChannelLink"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { PageNames } from '../constants';
  import PageHeader from './PageHeader';
  import ContentCardGroupGrid from './ContentCardGroupGrid';

  export default {
    name: 'ChannelsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      PageHeader,
      ContentCardGroupGrid,
    },
    computed: {
      ...mapState('topicsRoot', { channels: 'rootNodes' }),
    },
    methods: {
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
    },
    $trs: {
      channels: 'Channels',
      documentTitle: 'All channels',
    },
  };

</script>


<style lang="scss" scoped>

  .grid {
    margin-top: 24px;
  }

</style>
