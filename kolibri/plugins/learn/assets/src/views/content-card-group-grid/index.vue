<template>

  <div class="content-grid">
    <div>
      <ui-select
        v-if="showContentKindFilter"
        class="filter"
        :label="$tr('contentKinds')"
        :options="contentKindFilterOptions"
        v-model="contentKindFilterSelection"
      />

      <ui-select
        v-if="showChannelFilter"
        class="filter"
        :label="$tr('channels')"
        :options="channelFilterOptions"
        v-model="channelFilterSelection"
      />
    </div>

    <content-card
      v-for="content in contents"
      v-show="showContentCard(content)"
      :key="content.id"
      :title="content.title"
      :thumbnail="content.thumbnail"
      :class="{'grid-item': true, 'mobile': isMobile}"
      :kind="content.id === content.channel_id ? channelKind : content.kind"
      :progress="content.progress"
      :link="genContentLink(content.id, content.kind)"
    />

  </div>

</template>


<script>

  import validateLinkObject from 'kolibri.utils.validateLinkObject';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import { getChannels } from 'kolibri.coreVue.vuex.getters';
  import some from 'lodash/some';
  import uiSelect from 'keen-ui/src/UiSelect';
  import contentCard from '../content-card';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';

  export default {
    name: 'contentCardGroupGrid',
    $trs: {
      contentKinds: 'Content kinds',
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
      uiSelect,
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
      contentKindFilterSelection: '',
      channelFilterSelection: '',
    }),
    computed: {
      channelKind() {
        return ContentNodeKinds.CHANNEL;
      },
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
      // TODO: currently uiSelect does not support disabled options :(
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
    mounted() {
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
    &.mobile
      width: 100%

  .filter
    display: inline-block
    width: 200px
    margin-top: 16px
    margin-bottom: 16px
    margin-right: 16px

</style>
