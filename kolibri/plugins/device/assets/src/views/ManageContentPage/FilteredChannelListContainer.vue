<template>

  <div :class="{small: !windowIsLarge}">

    <slot name="header"></slot>

    <div class="top-panel">
      <p class="count-msg">
        {{ channelsCountMsg }}
      </p>
      <div class="filters">
        <KSelect
          v-model="languageFilter"
          class="filter-lang"
          :options="languageFilterOptions"
          :label="$tr('languageFilterLabel')"
          :inline="true"
        />
        <FilterTextbox
          v-model="titleFilter"
          class="filter-title"
          :placeholder="$tr('titleFilterPlaceholder')"
          :throttleInput="500"
        />
      </div>
    </div>

    <template v-if="selectAllCheckbox">
      <KCheckbox
        v-if="filteredItems.length > 0"
        class="select-all-checkbox"
        :label="$tr('selectAll')"
        :checked="selectAllIsChecked"
        @change="$emit('changeselectall', {isSelected: $event, filteredItems})"
      />
    </template>

    <slot name="abovechannels"></slot>

    <slot v-bind="{filteredItems,showItem}"></slot>

    <div
      v-if="filteredItems.length === 0"
      class="no-match"
    >
      {{ noMatchMsg }}
    </div>
  </div>

</template>


<script>

  import find from 'lodash/find';
  import differenceBy from 'lodash/differenceBy';
  import uniqBy from 'lodash/uniqBy';
  import KResponsiveWindowMixin from 'kolibri-components/src/KResponsiveWindowMixin';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';

  export default {
    name: 'FilteredChannelListContainer',
    components: {
      FilterTextbox,
    },
    mixins: [KResponsiveWindowMixin],
    props: {
      channels: {
        type: Array,
      },
      selectAllCheckbox: {
        type: Boolean,
        default: false,
      },
      selectedChannels: {
        type: Array,
        required: false,
      },
    },
    data() {
      return {
        languageFilter: {},
        titleFilter: '',
      };
    },
    computed: {
      selectAllIsChecked() {
        return differenceBy(this.filteredItems, this.selectedChannels, 'id').length === 0;
      },
      showItem() {
        return function(channel) {
          return Boolean(find(this.filteredItems, { id: channel.id }));
        }.bind(this);
      },
      allLanguagesOption() {
        return {
          label: this.$tr('allLanguages'),
          value: 'ALL',
        };
      },
      languageFilterOptions() {
        const codes = uniqBy(this.channels, 'lang_code')
          .map(({ lang_name, lang_code }) => ({
            value: lang_code,
            label: lang_name,
          }))
          .filter(x => x.value);
        return [this.allLanguagesOption, ...codes];
      },
      channelsCountMsg() {
        return this.$tr('numChannelsAvailable', { count: this.filteredItems.length });
      },
      filteredItems() {
        return this.channels.filter(this.channelPassesFilters);
      },
      noMatchMsg() {
        if (
          (this.titleFilter !== '' || this.languageFilter.value !== 'ALL') &&
          this.filteredItems.length === 0
        ) {
          return this.$tr('noMatchingItems');
        }
        return '';
      },
    },
    beforeMount() {
      this.languageFilter = { ...this.allLanguagesOption };
    },
    methods: {
      channelPassesFilters(channel) {
        let languageMatches = true;
        let titleMatches = true;
        let isOnDevice = true;
        if (this.inExportMode) {
          isOnDevice = this.channelIsOnDevice(channel);
        }
        if (this.languageFilter.value !== 'ALL') {
          languageMatches = channel.lang_code === this.languageFilter.value;
        }
        if (this.titleFilter) {
          // Similar code in userSearchUtils
          const tokens = this.titleFilter.split(/\s+/).map(val => val.toLowerCase());
          titleMatches = tokens.every(token => channel.name.toLowerCase().includes(token));
        }
        return languageMatches && titleMatches && isOnDevice;
      },
    },
    $trs: {
      languageFilterLabel: 'Language',
      titleFilterPlaceholder: 'Search for a channel…',
      allLanguages: 'All languages',
      numChannelsAvailable:
        '{count, number, integer} {count, plural, one {channel} other {channels}} available',
      noMatchingItems: 'There are no channels matching these filters',
      selectAll: 'Select all on page',
    },
  };

</script>


<style lang="scss" scoped>

  .top-panel {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    margin-bottom: 24px;
  }

  .count-msg {
    flex-grow: 1;
    max-width: 200px;
    margin: 0;
  }

  .filters {
    display: flex;
    flex-grow: 1;
    flex-wrap: wrap;
    margin-left: 16px;
  }

  .filter-lang {
    min-width: 240px;
  }

  .filter-title {
    flex-grow: 1;
    width: auto;
  }

  .small {
    .top-panel {
      flex-direction: column;
      margin-bottom: 8px;
    }

    .filters {
      align-self: stretch;
      margin-left: 0;
    }

    .filter-title {
      width: 100%;
    }

    .count-msg {
      order: 1;
      margin: 16px 0;
    }
  }

  .no-match {
    padding: 32px 0;
  }

</style>
