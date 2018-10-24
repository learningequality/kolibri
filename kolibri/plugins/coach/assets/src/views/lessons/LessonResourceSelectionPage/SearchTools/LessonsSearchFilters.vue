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
        v-show="roleFilterOptions.length > 0"
        class="ib"
      >
        <mat-svg
          category="social"
          name="person"
          class="filter-icon"
        />
        <KSelect
          :label="$tr('roleFilterLabel')"
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
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';

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
    components: {
      KSelect,
    },
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
        return { label: this.$tr('all'), value: null };
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
        const options = channelIds.map(id => find(this.channels, { id })).map(channel => ({
          label: channel.title,
          value: channel.id,
        }));
        return [this.allFilter, ...options];
      },
      roleValue() {
        return find(this.roleFilterOptions, { value: this.value.role }) || {};
      },
      roleFilterOptions() {
        if (this.searchResults.results.length === 0) {
          return [];
        }
        const hasCoachContents = find(
          this.searchResults.results,
          result => result.num_coach_contents > 0
        );
        const options = [this.allFilter];
        if (hasCoachContents) {
          options.push({ label: this.$tr('coach'), value: 'coach' });
        }
        options.push({ label: this.$tr('nonCoach'), value: 'nonCoach' });
        return options;
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
      all: 'All',
      audio: 'Audio',
      channelFilterLabel: 'Channel:',
      coach: 'Coach',
      contentKindFilterLabel: 'Type:',
      documents: 'Documents',
      exercises: 'Exercises',
      html5: 'Apps',
      nonCoach: 'Non-coach',
      roleFilterLabel: 'Show:',
      topics: 'Topics',
      videos: 'Videos',
      searchResultsMessage: `Results for '{searchTerm}'`,
      noSearchResultsMessage: `No results for '{searchTerm}'`,
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
