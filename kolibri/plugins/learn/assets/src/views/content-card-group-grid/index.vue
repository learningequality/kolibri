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
  import contentCard from '../content-card';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

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
      html5: 'HTML5 Apps',
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
      contentKindFilterOptions() {
        return [
          {
            label: this.$tr('all'),
            value: 'all',
          },
          {
            label: this.$tr('topics'),
            value: ContentNodeKinds.TOPIC,
            disabled: !this.resultsIncludeContentKind(ContentNodeKinds.TOPIC),
          },
          {
            label: this.$tr('exercises'),
            value: ContentNodeKinds.EXERCISE,
            disabled: !this.resultsIncludeContentKind(ContentNodeKinds.EXERCISE),
          },
          {
            label: this.$tr('videos'),
            value: ContentNodeKinds.VIDEO,
            disabled: !this.resultsIncludeContentKind(ContentNodeKinds.VIDEO),
          },
          {
            label: this.$tr('audio'),
            value: ContentNodeKinds.AUDIO,
            disabled: !this.resultsIncludeContentKind(ContentNodeKinds.AUDIO),
          },
          {
            label: this.$tr('documents'),
            value: ContentNodeKinds.DOCUMENT,
            disabled: !this.resultsIncludeContentKind(ContentNodeKinds.DOCUMENT),
          },
          {
            label: this.$tr('html5'),
            value: ContentNodeKinds.HTML5,
            disabled: !this.resultsIncludeContentKind(ContentNodeKinds.HTML5),
          },
        ];
      },
      channelFilterOptions() {
        const channelOptions = this.channels.map(channel => {
          return {
            label: channel.title,
            value: channel.id,
            disabled: !this.resultsIncludeChannel(channel.id),
          };
        });
        return [
          {
            label: this.$tr('all'),
            value: 'all',
          },
          ...channelOptions,
        ];
      },
    },
    beforeMount() {
      this.contentKindFilterSelection = this.contentKindFilterOptions[0];
      this.channelFilterSelection = this.channelFilterOptions[0];
    },
    methods: {
      resultsIncludeContentKind(kind) {
        return some(this.contents, content => content.kind === kind);
      },
      resultsIncludeChannel(channelId) {
        return some(this.contents, content => content.channel_id === channelId);
      },
      showContentCard(content) {
        return (
          (this.contentKindFilterSelection.value === 'all' ||
            this.contentKindFilterSelection.value === content.kind) &&
          (this.channelFilterSelection.value === 'all' ||
            this.channelFilterSelection.value === content.channel_id)
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
