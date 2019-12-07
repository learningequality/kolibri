<template>

  <div :class="{'fclc-sm': !windowIsLarge}">

    <slot name="header"></slot>

    <slot name="abovechannels"></slot>

    <KGrid class="top-panel">
      <template v-if="channels.length > 0">
        <KGridItem :layout12="{span: 4}">
          <KSelect
            v-model="languageFilter"
            class="filter-lang"
            :options="languageFilterOptions"
            :label="$tr('languageFilterLabel')"
            :inline="true"
          />
        </KGridItem>
        <KGridItem :layout12="{span: 5}" class="filter-title">
          <FilterTextbox
            v-model="titleFilter"
            :placeholder="$tr('titleFilterPlaceholder')"
            :throttleInput="500"
          />
        </KGridItem>
      </template>
      <KGridItem :layout12="{span: 3}">
        <p class="count-msg" data-test="available">
          {{ channelsCountMsg }}
        </p>
      </KGridItem>
    </KGrid>

    <template v-if="selectAllCheckbox">
      <KCheckbox
        v-if="filteredItems.length > 0"
        class="select-all-checkbox"
        :label="$tr('selectAll')"
        :checked="selectAllIsChecked"
        @change="handleChangeSelectAll({ isSelected:$event })"
      />
    </template>

    <slot v-bind="{filteredItems, showItem, itemIsSelected, handleChange}"></slot>

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
  import unionBy from 'lodash/unionBy';
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
      itemIsSelected() {
        return function(channel) {
          return Boolean(find(this.selectedChannels, { id: channel.id }));
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
      handleChange({ channel, isSelected }) {
        if (isSelected) {
          if (!this.itemIsSelected(channel)) {
            this.$emit('update:selectedChannels', [...this.selectedChannels, channel]);
          }
        } else {
          this.$emit(
            'update:selectedChannels',
            this.selectedChannels.filter(({ id }) => id !== channel.id)
          );
        }
        this.$emit('update:selected');
      },
      handleChangeSelectAll({ isSelected }) {
        if (isSelected) {
          this.$emit(
            'update:selectedChannels',
            unionBy(this.selectedChannels, this.filteredItems, 'id')
          );
        } else {
          this.$emit(
            'update:selectedChannels',
            differenceBy(this.selectedChannels, this.filteredItems, 'id')
          );
        }
      },
      channelPassesFilters(channel) {
        let languageMatches = true;
        let titleMatches = true;
        if (this.languageFilter.value !== 'ALL') {
          languageMatches = channel.lang_code === this.languageFilter.value;
        }
        if (this.titleFilter) {
          // Similar code in userSearchUtils
          const tokens = this.titleFilter.split(/\s+/).map(val => val.toLowerCase());
          titleMatches = tokens.every(token => channel.name.toLowerCase().includes(token));
        }
        return languageMatches && titleMatches;
      },
    },
    $trs: {
      languageFilterLabel: 'Language',
      titleFilterPlaceholder: 'Search for a channel',
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
    margin-bottom: 24px;

    .fclc-sm & {
      margin-bottom: 8px;
    }
  }

  .filter-lang {
    width: 100%;
    min-width: 240px;
    max-width: 300px;
  }

  .filter-title {
    padding-top: 8px;

    .fclc-sm & {
      margin-bottom: 8px;
    }
  }

  .no-match {
    padding: 32px 0;
  }

</style>
