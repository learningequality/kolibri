<template>

  <KSelect
    class="selector"
    :style="selectorStyle"
    :inline="windowIsLarge"
    label="Sort by"
    :options="sortOptions"
    :value="selected"
    @change="handleSortChange($event.value)"
  />

</template>


<script>

  import pickBy from 'lodash/pickBy';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';

  export default {
    name: 'SortFilter',
    mixins: [responsiveWindowMixin],
    data() {
      return {
        sortOptions: [
          {
            label: 'Newest',
            value: 'newest',
          },
          {
            label: 'Oldest',
            value: 'oldest',
          },
          {
            label: 'Largest file size',
            value: 'largest',
          },
          {
            label: 'Smallest file size',
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
