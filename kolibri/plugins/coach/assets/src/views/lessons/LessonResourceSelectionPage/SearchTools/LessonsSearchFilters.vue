<template>

  <div>
    <h2>
      {{ searchResultsSubheader }}
    </h2>

    <div>
      <div class="ib">
        <KIcon
          class="icon"
          icon="filterList"
        />
        <KSelect
          :label="$tr('contentKindFilterLabel')"
          :options="contentKindFilterOptions"
          :inline="true"
          :disabled="contentKindFilterOptions.length === 1"
          :value="contentKindValue"
          class="filter"
          @change="updateFilter('kind', $event)"
        />
      </div>

      <div class="ib">
        <KIcon
          class="icon"
          icon="channel"
        />
        <KSelect
          :label="$tr('channelFilterLabel')"
          :options="channelFilterOptions"
          :inline="true"
          :disabled="channelFilterOptions.length === 1"
          :value="channelValue"
          class="filter"
          @change="updateFilter('channel', $event)"
        />
      </div>

      <div
        v-if="coachContentInResults"
        class="ib"
      >
        <KIcon
          class="icon"
          icon="coachContent"
        />
        <KSelect
          :label="$tr('coachResourcesLabel')"
          :options="roleFilterOptions"
          :inline="true"
          :disabled="!roleFilterOptions.length"
          :value="roleValue"
          class="filter"
          @change="updateFilter('role', $event)"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import find from 'lodash/find';
  import { ContentNodeKinds } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  const kindFilterToLabelMap = {
    [ContentNodeKinds.TOPIC]: 'topics',
    [ContentNodeKinds.EXERCISE]: 'exercises',
    [ContentNodeKinds.VIDEO]: 'videos',
    [ContentNodeKinds.AUDIO]: 'audio',
    [ContentNodeKinds.DOCUMENT]: 'documents',
    [ContentNodeKinds.HTML5]: 'html5',
  };

  export default {
    name: 'LessonsSearchFilters',
    mixins: [commonCoreStrings],
    props: {
      searchResults: {
        type: Object,
        default() {
          return {
            results: [],
            content_kinds: [],
            channel_ids: [],
          };
        },
      },
      value: {
        // Map of { kind, channel, role }
        type: Object,
        required: true,
      },
      searchTerm: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
      noResults() {
        return this.searchResults.results.length === 0;
      },
      searchResultsSubheader() {
        const trOptions = { searchTerm: this.searchTerm };
        if (this.noResults) {
          return this.$tr('noSearchResultsMessage', trOptions);
        } else {
          return this.$tr('searchResultsMessage', trOptions);
        }
      },
      allFilter() {
        return { label: this.coreString('allLabel'), value: null };
      },
      contentKindValue() {
        return find(this.contentKindFilterOptions, { value: this.value.kind }) || {};
      },
      contentKindFilterOptions() {
        const contentKinds = this.searchResults.content_kinds;
        const options = contentKinds.map(kind => ({
          label: this.$tr(kindFilterToLabelMap[kind]),
          value: kind,
        }));
        return [this.allFilter, ...options];
      },
      channelValue() {
        return find(this.channelFilterOptions, { value: this.value.channel }) || {};
      },
      channelFilterOptions() {
        const channelIds = this.searchResults.channel_ids;
        const options = channelIds
          .map(id => find(this.channels, { id }))
          .map(channel => ({
            label: channel.title,
            value: channel.id,
          }));
        return [this.allFilter, ...options];
      },
      roleValue() {
        return find(this.roleFilterOptions, { value: this.value.role }) || {};
      },
      coachContentInResults() {
        return Boolean(find(this.searchResults.results, result => result.num_coach_contents > 0));
      },
      roleFilterOptions() {
        return [
          // 'Show' is synonymous with 'All'
          { label: this.coreString('showAction'), value: null },
          { label: this.$tr('hideAction'), value: 'nonCoach' },
        ];
      },
    },
    methods: {
      updateFilter(filterKey, event) {
        this.$emit('input', {
          ...this.value,
          [filterKey]: event.value,
        });
      },
    },
    $trs: {
      audio: {
        message: 'Audio',
        context:
          "A type of file that users can search for using the filter in the 'Manage lessons resources' screen.",
      },
      channelFilterLabel: {
        message: 'Channel:',
        context:
          'Refers to an option in the search filter where users can search by different resource channel types.',
      },
      contentKindFilterLabel: {
        message: 'Type:',
        context:
          'Title of a search filter. Refers to the type of resource material, for example, documents, videos, audio etc.',
      },
      documents: {
        message: 'Documents',
        context: 'Type of resource material.',
      },
      exercises: {
        message: 'Exercises',
        context: 'Type of resource material.',
      },
      html5: {
        message: 'Apps',
        context: 'Type of resource material.',
      },
      coachResourcesLabel: {
        message: 'Coach resources:',
        context:
          "Title of search filter. Users have the option to either 'Show' or 'Hide' coach resources in a search.\n\nCoach resources can be lesson plans, professional development readings, training materials, etc. only viewable by coaches and not learners.",
      },
      topics: {
        message: 'Folders',
        context: 'A group of learning resource materials.',
      },
      videos: {
        message: 'Videos',
        context: 'Type of resource material.',
      },
      hideAction: {
        message: 'Hide',
        context:
          "Users have the option to either 'Show' or 'Hide' coach resources.\n\nCoach resources can be lesson plans, professional development readings, training materials, etc. only viewable by coaches and not learners.",
      },
      searchResultsMessage: {
        message: `Results for '{searchTerm}'`,
        context: 'Indicates the results for a specific search term.',
      },
      noSearchResultsMessage: {
        message: `No results for '{searchTerm}'`,
        context: 'Message displayed if no results match the search term used.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .ib {
    position: relative;
    display: inline-block;
  }

  .icon {
    margin-bottom: 16px;
  }

  .filter {
    margin-bottom: 16px;
    margin-left: 28px;
  }

  .filter-icon {
    position: absolute;
    top: 50%;
    bottom: 50%;
    margin-left: 12px;
    transform: translate(-50%, -50%);
  }

</style>
