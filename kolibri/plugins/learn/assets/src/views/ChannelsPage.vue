<template>

  <div>
    <PageHeader
      :title="coreString('channelsLabel')"
      class="visuallyhidden"
    />
    <ShortcutCardGroupGrid
      v-if="shortcuts.length"
      class="grid"
      :shortcuts="shortcuts"
      :genContentLink="genShortcutLink"
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
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { PageNames } from '../constants';
  import PageHeader from './PageHeader';
  import ShortcutCardGroupGrid from './ShortcutCardGroupGrid';
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
      ShortcutCardGroupGrid,
      ChannelCardGroupGrid,
    },
    mixins: [commonCoreStrings],
    computed: {
      ...mapState('topicsRoot', { channels: 'rootNodes', shortcuts: 'shortcutNodes' }),
    },
    methods: {
      genChannelLink(channel_id) {
        return {
          name: PageNames.TOPICS_CHANNEL,
          params: { channel_id },
        };
      },
      genShortcutLink(id, kind) {
        return {
          name: kind === ContentNodeKinds.TOPIC ? PageNames.TOPICS_TOPIC : PageNames.TOPICS_CONTENT,
          params: { id },
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
