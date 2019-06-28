<template>

  <div>
    <PageHeader
      :title="coreString('channelsLabel')"
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
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
    mixins: [commonCoreStrings],
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
      documentTitle: 'All channels',
    },
  };

</script>


<style lang="scss" scoped>

  .grid {
    margin-top: 24px;
  }

</style>
