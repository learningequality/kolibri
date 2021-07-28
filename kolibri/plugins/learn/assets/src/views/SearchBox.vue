<template>

  <form
    class="search-box"
    @submit.prevent="updateSearchQuery"
    @keydown.esc.prevent="handleEscKey"
  >
    <div
      class="search-box-row"
      :style="{
        backgroundColor: $themeTokens.surface,
        borderColor: $themePalette.grey.v_300,
        fontSize: '16px',
      }"
    >
      <label class="visuallyhidden" for="searchfield">{{ coreString('searchLabel') }}</label>
      <input
        id="searchfield"
        ref="searchInput"
        v-model.trim="searchInputValue"
        type="search"
        class="search-input"
        :class="$computedClass(searchInputStyle)"
        dir="auto"
        :placeholder="coreString('searchLabel')"
      >
      <div class="search-buttons-wrapper">
        <KIconButton
          icon="clear"
          :color="$themeTokens.text"
          size="small"
          class="search-clear-button"
          :class="searchInputValue === '' ? '' : 'search-clear-button-visible'"
          :ariaLabel="$tr('clearButtonLabel')"
          @click="handleClickClear"
        />
        <div
          class="search-submit-button-wrapper"
          :style="{ backgroundColor: $themeTokens.primaryDark }"
        >
          <KIconButton
            :icon="icon"
            color="white"
            class="search-submit-button"
            :disabled="searchBarDisabled"
            :class="{ 'rtl-icon': icon === 'forward' && isRtl }"
            :style="{ fill: $themeTokens.textInverted }"
            :ariaLabel="$tr('startSearchButtonLabel')"
            type="submit"
          />
        </div>
      </div>
    </div>
    <div
      v-if="filters"
      class="filters"
    >
      <div class="ib">
        <KIcon
          icon="filterList"
          class="filter-icon"
          style="width: 24px; height: 24px;"
        />
        <KSelect
          ref="contentKindFilter"
          :label="$tr('resourceType')"
          :options="contentKindFilterOptions"
          :inline="true"
          :disabled="!contentKindFilterOptions.length"
          :value="contentKindFilterSelection"
          class="filter"
          @change="updateSearchQuery"
        />
      </div>
      <div
        class="ib"
      >
        <KIcon
          icon="channel"
          class="filter-icon"
          style="width: 24px; height: 24px;"
        />
        <KSelect
          ref="channelFilter"
          :label="coreString('channelsLabel')"
          :options="channelFilterOptions"
          :inline="true"
          :disabled="!channelFilterOptions.length"
          :value="channelFilterSelection"
          class="filter"
          :style="channelFilterStyle"
          @change="updateSearchQuery"
        />
      </div>
    </div>
  </form>

</template>


<script>

  import maxBy from 'lodash/maxBy';
  import pickBy from 'lodash/pickBy';
  import { mapGetters, mapState } from 'vuex';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveElementMixin from 'kolibri.coreVue.mixins.responsiveElementMixin';
  import { PageNames } from '../constants';

  const ALL_FILTER = null;

  const kindFilterToLabelMap = {
    [ContentNodeKinds.TOPIC]: 'topics',
    [ContentNodeKinds.EXERCISE]: 'exercises',
    [ContentNodeKinds.VIDEO]: 'videos',
    [ContentNodeKinds.AUDIO]: 'audio',
    [ContentNodeKinds.DOCUMENT]: 'documents',
    [ContentNodeKinds.HTML5]: 'html5',
  };

  export default {
    name: 'SearchBox',
    mixins: [commonCoreStrings, responsiveElementMixin],
    props: {
      icon: {
        type: String,
        default: 'search',
        validator(val) {
          return ['search', 'forward'].includes(val);
        },
      },
      filters: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        searchInputValue: this.$store.state.search.searchTerm,
        contentKindFilterSelection: {},
        channelFilterSelection: {},
      };
    },
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
      ...mapState('search', ['searchTerm', 'channel_ids', 'content_kinds']),
      channelFilterStyle() {
        const maxWidth = 375;
        // If window is small, just let it have its default width
        if (this.channelFilterOptions.length === 0 || this.elementWidth < maxWidth + 32) {
          return {};
        }
        // Otherwise, adjust the width based on the longest channel name,
        // capped at 375px, or approx 50 characters
        const longestChannelName = maxBy(
          this.channelFilterOptions,
          channel => channel.label.length
        );
        const maxPx = Math.min(longestChannelName.label.length * 8, maxWidth);
        return {
          width: `${maxPx}px`,
        };
      },
      allFilter() {
        return { label: this.coreString('allLabel'), value: ALL_FILTER };
      },
      contentKindFilterOptions() {
        if (this.content_kinds.length) {
          const options = Object.keys(kindFilterToLabelMap)
            .filter(kind => this.content_kinds.includes(kind))
            .map(kind => ({
              label: this.$tr(kindFilterToLabelMap[kind]),
              value: kind,
            }));
          return [this.allFilter, ...options];
        }
        return [];
      },
      channelFilterOptions() {
        if (this.channel_ids.length) {
          const options = this.channels
            .filter(channel => this.channel_ids.includes(channel.id))
            .map(channel => ({
              label: channel.title,
              value: channel.id,
            }));
          return [this.allFilter, ...options];
        }
        return [];
      },
      searchBarDisabled() {
        // Disable the search bar if it has been cleared or has not been changed
        return this.searchInputValue === '' || this.searchInputValue === this.searchTerm;
      },
      searchInputStyle() {
        return {
          '::placeholder': {
            color: this.$themeTokens.annotation,
          },
          color: this.$themeTokens.text,
        };
      },
    },
    beforeMount() {
      if (this.filters) {
        this.contentKindFilterSelection =
          this.contentKindFilterOptions.find(
            option => option.value === this.$store.state.search.kindFilter
          ) || this.allFilter;
        this.channelFilterSelection =
          this.channelFilterOptions.find(
            option => option.value === this.$store.state.search.channelFilter
          ) || this.allFilter;
      }
    },
    methods: {
      clearInput() {
        this.searchInputValue = '';
      },
      handleEscKey() {
        if (this.searchInputValue === '') {
          this.$emit('closeDropdownSearchBox');
        } else {
          this.clearInput();
        }
      },
      handleClickClear() {
        this.clearInput();
        this.$refs.searchInput.focus();
      },
      updateSearchQuery() {
        const query = {
          searchTerm: this.searchInputValue || this.$route.query.searchTerm,
        };
        if (this.filters) {
          query.kind = this.$refs.contentKindFilter.selection.value;
          query.channel_id = this.$refs.channelFilter.selection.value;
        }
        this.$router
          .push({
            name: PageNames.SEARCH,
            query: pickBy(query),
          })
          .catch(() => {});
      },
    },
    $trs: {
      clearButtonLabel: {
        message: 'Clear',
        context:
          "Used any time to clear some information. Also can describe the icon 'X' used to clear the search field.",
      },
      startSearchButtonLabel: {
        message: 'Start search',
        context:
          'Describes the functionality of the search icon. By selecting it the user starts a search for the term in the search field.',
      },
      resourceType: {
        message: 'Type',
        context:
          'Learners can filter their searches for resources by type. For example, audio files, video files etc.',
      },
      topics: {
        message: 'Topics',
        context:
          'Learners can filter their searches for resources by type. In this case, topics.\n\nA topic is a collection of resources and other topics within a channel.',
      },
      exercises: {
        message: 'Exercises',
        context:
          'Learners can filter their searches for resources by type. In this case, exercises.',
      },
      videos: {
        message: 'Videos',
        context: 'Learners can filter their searches for resources by type. In this case, videos.',
      },
      audio: {
        message: 'Audio',
        context:
          'Learners can filter their searches for resources by type. In this case, audio files.',
      },
      documents: {
        message: 'Documents',
        context:
          'Learners can filter their searches for resources by type. In this case, documents.',
      },
      html5: {
        message: 'Apps',
        context: 'Learners can filter their searches for resources by type. In this case, apps.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri-design-system/lib/styles/definitions';

  .search-box {
    margin-right: 8px;
  }

  .search-box-within-action-bar {
    width: 235px;
  }

  .search-box-row {
    display: table;
    width: 100%;
    max-width: 450px;
    overflow: hidden;
    border: solid 1px;
    border-radius: $radius;
  }

  .search-input {
    display: table-cell;
    width: 100%;
    height: 36px;
    padding: 0;
    padding-left: 8px;
    margin: 0;
    vertical-align: middle;
    border: 0;

    // removes the IE clear button
    &::-ms-clear {
      display: none;
    }
  }

  .search-buttons-wrapper {
    display: table-cell;
    width: 80px;
    height: 36px;
    text-align: right;
    vertical-align: middle;
  }

  .search-clear-button {
    width: 24px;
    height: 24px;
    margin-right: 6px;
    vertical-align: middle;
    visibility: hidden;
  }

  .search-clear-button-visible {
    visibility: visible;
  }

  .search-submit-button {
    width: 36px;
    height: 36px;
  }

  .search-submit-button-wrapper {
    display: inline-block;
    vertical-align: middle;
  }

  .filter-icon {
    position: absolute;
    top: 50%;
    bottom: 50%;
    margin-left: 12px;
    transform: translate(-50%, -50%);
  }

  .filter:nth-of-type(1) {
    margin-right: 16px;
  }

  .filter {
    margin-bottom: 16px;
    margin-left: 28px;
  }

  .filters {
    margin-top: 24px;
  }

  .ib {
    position: relative;
    display: inline-block;
  }

</style>
