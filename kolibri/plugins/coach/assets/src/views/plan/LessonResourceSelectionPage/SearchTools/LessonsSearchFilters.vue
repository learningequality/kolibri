<template>

  <div>
    <h2>
      {{ searchResultsSubheader }}
    </h2>

    <div>
      <div class="ib">
        <mat-svg
          category="content"
          name="filter_list"
          class="filter-icon"
        />
        <KSelect
          :label="$tr('contentKindFilterLabel')"
          :options="contentKindFilterOptions"
          :inline="true"
          :disabled="!contentKindFilterOptions.length"
          :value="contentKindValue"
          class="filter"
          @change="updateFilter('kind', $event)"
        />
      </div>

      <div class="ib">
        <mat-svg
          category="navigation"
          name="apps"
          class="filter-icon"
        />
        <KSelect
          :label="$tr('channelFilterLabel')"
          :options="channelFilterOptions"
          :inline="true"
          :disabled="!channelFilterOptions.length"
          :value="channelValue"
          class="filter"
          @change="updateFilter('channel', $event)"
        />
      </div>

      <div
        v-if="coachContentInResults"
        class="ib"
      >
        <mat-svg
          name="local_library"
          category="maps"
          class="filter-icon"
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
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

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
      searchResultsSubheader() {
        const msg =
          this.searchResults.results.length === 0
            ? 'noSearchResultsMessage'
            : 'searchResultsMessage';
        return this.$tr(msg, { searchTerm: this.searchTerm });
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
      audio: 'Audio',
      channelFilterLabel: 'Channel:',
      contentKindFilterLabel: 'Type:',
      documents: 'Documents',
      exercises: 'Exercises',
      html5: 'Apps',
      coachResourcesLabel: 'Coach resources:',
      topics: 'Topics',
      videos: 'Videos',
      hideAction: 'Hide',
      // Linter will not find these dynamic uses.
      /* eslint-disable kolibri/vue-no-unused-translations */
      searchResultsMessage: `Results for '{searchTerm}'`,
      noSearchResultsMessage: `No results for '{searchTerm}'`,
      /* eslint-enable kolibri/vue-no-unused-translations */
    },
  };

</script>


<style lang="scss" scoped>

  .ib {
    position: relative;
    display: inline-block;
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
