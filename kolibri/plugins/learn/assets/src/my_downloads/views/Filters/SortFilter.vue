<template>

  <KSelect
    class="selector"
    :style="selectorStyle"
    :inline="windowIsLarge"
    :label="coreString('sortBy')"
    :options="sortOptions"
    :value="selected"
    @change="handleSortChange($event.value)"
  />

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'SortFilter',
    mixins: [commonCoreStrings, responsiveWindowMixin],
    data() {
      return {
        sortOptions: [
          {
            label: this.coreString('newestResource'),
            value: 'newest',
          },
          {
            label: this.coreString('oldestResource'),
            value: 'oldest',
          },
          {
            label: this.coreString('largestFile'),
            value: 'largest',
          },
          {
            label: this.coreString('smallestFile'),
            value: 'smallest',
          },
        ],
      };
    },
    computed: {
      selectorStyle() {
        return {
          color: this.$themeTokens.text,
          backgroundColor: this.$themePalette.grey.v_200,
          borderRadius: '2px',
          marginTop: '16px',
          marginBottom: 0,
          width: this.windowIsLarge
            ? 'calc(50% - 16px)' // 16px is the margin of the select
            : '100%',
        };
      },
      selected() {
        return this.sortOptions.find(option => option.value === this.sortOptionSelected);
      },
      sortOptionSelected: {
        get() {
          return this.$route.query.sort || 'newest';
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              sort: value,
            }),
          });
        },
      },
    },
    methods: {
      handleSortChange(value) {
        this.sortOptionSelected = value;
      },
    },
  };

</script>
