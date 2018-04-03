<template>

  <div class="content-grid">
    <div>
      <k-select
        v-if="showContentKindFilter"
        :label="$tr('resourceType')"
        :options="contentKindFilterOptions"
        :inline="true"
        v-model="contentKindFilterSelection"
      />

      <k-select
        v-if="showChannelFilter"
        :label="$tr('channels')"
        :options="channelFilterOptions"
        :inline="true"
        v-model="channelFilterSelection"
      />
    </div>

    <content-card
      v-for="content in contents"
      v-show="showContentCard(content)"
      class="grid-item"
      :isMobile="isMobile"
      :key="content.id"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :kind="content.kind"
      :progress="content.progress"
      :numCoachContent="content.num_coach_content"
      :link="genContentLink(content.id, content.kind)"
    />

  </div>

</template>


<script>

  import { validateLinkObject } from 'kolibri.utils.validators';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { getChannels } from 'kolibri.coreVue.vuex.getters';
  import some from 'lodash/some';
  import kSelect from 'kolibri.coreVue.components.kSelect';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import contentCard from './content-card';

  const ALL_FILTER = 'all';

  const kindFilterToLabelMap = {
    [ContentNodeKinds.TOPIC]: 'topics',
    [ContentNodeKinds.EXERCISE]: 'exercises',
    [ContentNodeKinds.VIDEO]: 'videos',
    [ContentNodeKinds.AUDIO]: 'audio',
    [ContentNodeKinds.DOCUMENT]: 'documents',
    [ContentNodeKinds.HTML5]: 'html5',
  };

  export default {
    name: 'contentCardGroupGrid',
    $trs: {
      resourceType: 'Type',
      all: 'All',
      topics: 'Topics',
      exercises: 'Exercises',
      videos: 'Videos',
      audio: 'Audio',
      documents: 'Documents',
      html5: 'Apps',
      channels: 'Channels',
    },
    components: {
      contentCard,
      kSelect,
    },
    mixins: [responsiveWindow],
    props: {
      contents: {
        type: Array,
        required: true,
      },
      genContentLink: {
        type: Function,
        validator(value) {
          return validateLinkObject(value(1, 'exercise'));
        },
        default: () => {},
        required: false,
      },
      showContentKindFilter: {
        type: Boolean,
        default: true,
      },
      showChannelFilter: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      contentKindFilterSelection: {},
      channelFilterSelection: {},
    }),
    computed: {
      isMobile() {
        return this.windowSize.breakpoint <= 1;
      },
      allFilter() {
        return { label: this.$tr('all'), value: ALL_FILTER };
      },
      contentKindFilterOptions() {
        const options = Object.keys(kindFilterToLabelMap).map(kind => ({
          label: this.$tr(kindFilterToLabelMap[kind]),
          value: kind,
          disabled: !this.resultsIncludeContentKind(kind),
        }));
        return [this.allFilter, ...options];
      },
      channelFilterOptions() {
        const options = this.channels.map(channel => {
          return {
            label: channel.title,
            value: channel.id,
            disabled: !this.resultsIncludeChannel(channel.id),
          };
        });
        return [this.allFilter, ...options];
      },
    },
    beforeMount() {
      this.contentKindFilterSelection = this.contentKindFilterOptions[0];
      this.channelFilterSelection = this.channelFilterOptions[0];
    },
    methods: {
      resultsIncludeContentKind(kindFilter) {
        return some(this.contents, { kind: kindFilter });
      },
      resultsIncludeChannel(channelId) {
        return some(this.contents, { channel_id: channelId });
      },
      showContentCard(content) {
        const kindFilter = this.contentKindFilterSelection.value;
        const channelFilter = this.channelFilterSelection.value;
        return (
          (kindFilter === ALL_FILTER || kindFilter === content.kind) &&
          (channelFilter === ALL_FILTER || channelFilter === content.channel_id)
        );
      },
    },
    vuex: {
      getters: {
        channels: getChannels,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  $gutters = 16px

  .grid-item
    margin-right: $gutters
    margin-bottom: $gutters

</style>
