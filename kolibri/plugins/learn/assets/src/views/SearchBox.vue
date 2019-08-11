<template>

  <form
    class="search-box"
    @submit.prevent="search"
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
        v-model.trim="searchQuery"
        type="search"
        class="search-input"
        :class="$computedClass(searchInputStyle)"
        dir="auto"
        :placeholder="coreString('searchLabel')"
      >
      <div class="search-buttons-wrapper">
        <UiIconButton
          color="black"
          size="small"
          class="search-clear-button"
          :class="searchQuery === '' ? '' : 'search-clear-button-visible'"
          :style="{ color: $themeTokens.text }"
          :ariaLabel="$tr('clearButtonLabel')"
          @click="handleClickClear"
        >
          <mat-svg
            name="clear"
            category="content"
          />
        </UiIconButton>

        <div
          class="search-submit-button-wrapper"
          :style="{ backgroundColor: $themeTokens.primaryDark }"
        >
          <UiIconButton
            type="secondary"
            color="white"
            class="search-submit-button"
            :disabled="!searchUpdate"
            :class="{ 'rtl-icon': icon === 'arrow_forward' && isRtl }"
            :style="{ fill: $themeTokens.textInverted }"
            :ariaLabel="$tr('startSearchButtonLabel')"
            @click="search"
          >
            <mat-svg
              v-if="icon === 'search'"
              name="search"
              category="action"
            />
            <mat-svg
              v-if="icon === 'arrow_forward'"
              name="arrow_forward"
              category="navigation"
            />
          </UiIconButton>
        </div>
      </div>
    </div>
    <div
      v-if="filters"
      class="filters"
    >
      <div class="ib">
        <mat-svg
          category="content"
          name="filter_list"
          class="filter-icon"
        />
        <KSelect
          ref="contentKindFilter"
          :label="$tr('resourceType')"
          :options="contentKindFilterOptions"
          :inline="true"
          :disabled="!contentKindFilterOptions.length"
          :value="contentKindFilterSelection"
          class="filter"
          @change="updateFilter"
        />
      </div>
      <div
        class="ib"
      >
        <mat-svg
          category="navigation"
          name="apps"
          class="filter-icon"
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
          @change="updateFilter"
        />
      </div>
    </div>
  </form>

</template>


<script>

  import maxBy from 'lodash/maxBy';
  import { mapGetters, mapState } from 'vuex';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
    components: {
      UiIconButton,
    },
    mixins: [commonCoreStrings],
    props: {
      icon: {
        type: String,
        default: 'search',
        validator(val) {
          return ['search', 'arrow_forward'].includes(val);
        },
      },
      filters: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        searchQuery: this.$store.state.search.searchTerm,
        contentKindFilterSelection: {},
        channelFilterSelection: {},
      };
    },
    computed: {
      ...mapGetters({
        channels: 'getChannels',
      }),
      ...mapState('search', [
        'searchTerm',
        'channel_ids',
        'content_kinds',
        'kindFilter',
        'channelFilter',
      ]),
      channelFilterStyle() {
        const longestChannelName = maxBy(
          this.channelFilterOptions,
          channel => channel.label.length
        );
        // Adjust the width based on the longest channel name
        return {
          width: `${longestChannelName.label.length * 10}px`,
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
      filterUpdate() {
        return (
          this.contentKindFilterSelection.value !== this.kindFilter ||
          this.channelFilterSelection.value !== this.channelFilter
        );
      },
      searchUpdate() {
        return this.searchQuery !== this.searchTerm || this.filterUpdate;
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
    watch: {
      searchTerm(val) {
        this.searchQuery = val || '';
      },
    },
    beforeMount() {
      this.contentKindFilterSelection =
        this.contentKindFilterOptions.find(
          option => option.value === this.$store.state.search.kindFilter
        ) || this.allFilter;
      this.channelFilterSelection =
        this.channelFilterOptions.find(
          option => option.value === this.$store.state.search.channelFilter
        ) || this.allFilter;
    },
    methods: {
      handleEscKey() {
        if (this.searchQuery === '') {
          this.$emit('closeDropdownSearchBox');
        } else {
          this.searchQuery = '';
        }
      },
      handleClickClear() {
        this.searchQuery = '';
        this.$refs.searchInput.focus();
      },
      updateFilter() {
        this.search(true);
      },
      search(filterUpdate = false) {
        if (this.searchQuery !== '') {
          const query = {
            searchTerm: this.searchQuery,
          };
          if (filterUpdate === true) {
            if (this.$refs.contentKindFilter.selection.value) {
              query.kind = this.$refs.contentKindFilter.selection.value;
            }
            if (this.$refs.channelFilter.selection.value) {
              query.channel_id = this.$refs.channelFilter.selection.value;
            }
          }
          this.$router.push({
            name: PageNames.SEARCH,
            query,
          });
        }
      },
    },
    $trs: {
      clearButtonLabel: 'Clear',
      startSearchButtonLabel: 'Start search',
      resourceType: 'Type',
      topics: 'Topics',
      exercises: 'Exercises',
      videos: 'Videos',
      audio: 'Audio',
      documents: 'Documents',
      html5: 'Apps',
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

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
    width: 78px;
    height: 36px;
    text-align: right;
    vertical-align: middle;
  }

  .search-clear-button {
    width: 24px;
    height: 24px;
    margin-right: 6px;
    margin-left: 6px;
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
