<template>

  <div>
    <PageHeader
      :title="coreString('channelsLabel')"
      class="visuallyhidden"
    />
    <ChannelCardGroupGrid
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
  import ChannelCardGroupGrid from './ChannelCardGroupGrid';

  export default {
    name: 'ChannelsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      PageHeader,
      ChannelCardGroupGrid,
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
      documentTitle: {
        message: 'All channels',
        context:
          'A channel is a set of learning resources. This title is seen on a page where all the channels available to the learner are shown.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .grid {
    margin-top: 24px;
  }

  .channel-renderer {
    z-index: 5; // needs to be higher than AppBar
  }

</style>
