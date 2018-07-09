<template>

  <div>
    <page-header :title="$tr('channels')" class="visuallyhidden" />
    <content-card-group-grid
      class="grid"
      :contents="channels"
      :genContentLink="genChannelLink"
      v-if="channels.length"
      :showContentKindFilter="false"
    />
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { PageNames } from '../constants';
  import pageHeader from './page-header';
  import contentCardGroupGrid from './content-card-group-grid';

  export default {
    name: 'channelsPage',
    $trs: {
      channels: 'Channels',
    },
    components: {
      pageHeader,
      contentCardGroupGrid,
    },
    computed: {
      ...mapState({
        channels: state => state.pageState.rootNodes,
      }),
    },
    methods: {
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .grid {
    margin-top: 24px;
  }

</style>
