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
        />
      </div>
    </div>

    <slot :filteredItems="filteredItems"></slot>

    <div class="no-match">
      {{ noMatchMsg }}
    </div>
  </div>

</template>


<script>

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
    },
    data() {
      return {
        languageFilter: {},
        titleFilter: '',
      };
    },
    computed: {
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
    margin: 0;
  }

  .filters {
    display: flex;
    flex-grow: 1;
    flex-wrap: wrap;
    margin-left: 16px;
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
