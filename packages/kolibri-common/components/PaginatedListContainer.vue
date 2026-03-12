<template>

  <div>
    <PaginatedListContainerNav
      v-if="position === 'top'"
      v-bind="navProps"
      @changePage="changePage"
    />

    <KGrid>
      <KGridItem :layout12="{ span: searchFieldBlock ? 12 : 7 }">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem
        :layout12="{ span: searchFieldBlock ? 12 : 5, alignment: 'right' }"
        class="text-filter"
      >
        <FilterTextbox
          v-model="filterInput"
          :placeholder="filterPlaceholder"
          :style="{ width: searchFieldBlock ? '100%' : null }"
        />
      </KGridItem>
    </KGrid>

    <div>
      <slot v-bind="{ items: visibleFilteredItems, filterInput }"></slot>
    </div>

    <PaginatedListContainerNav
      v-if="position === 'bottom'"
      v-bind="navProps"
      @changePage="changePage"
    />
  </div>

</template>


<script>

  import clamp from 'lodash/clamp';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import filterUsersByNames from 'kolibri-common/utils/filterUsersByNames';
  import PaginatedListContainerNav from './PaginatedListContainerNav';

  export default {
    name: 'PaginatedListContainer',
    components: {
      FilterTextbox,
      PaginatedListContainerNav,
    },
    props: {
      // The entire list of items
      items: {
        type: Array,
        required: true,
      },
      filterPlaceholder: {
        type: String,
        required: true,
      },
      itemsPerPage: {
        type: Number,
        required: false,
        default: 30,
      },
      searchFieldBlock: {
        type: Boolean,
        required: false,
      },
      position: {
        type: String,
        default: 'bottom',
        validator: value => ['top', 'bottom'].includes(value),
      },
    },
    data() {
      return {
        filterInput: '',
        currentPage: 1,
      };
    },
    computed: {
      filteredItems() {
        return filterUsersByNames(this.items, this.filterInput);
      },
      numFilteredItems() {
        return this.filteredItems.length;
      },
      totalPages() {
        return Math.ceil(this.numFilteredItems / this.itemsPerPage);
      },
      startRange() {
        return (this.currentPage - 1) * this.itemsPerPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredItems);
      },
      endRange() {
        return this.currentPage * this.itemsPerPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredItems);
      },
      visibleFilteredItems() {
        return this.filteredItems.slice(this.startRange, this.endRange);
      },
      navProps() {
        return {
          label: this.$tr('pagination', {
            visibleStartRange: this.visibleStartRange,
            visibleEndRange: this.visibleEndRange,
            numFilteredItems: this.numFilteredItems,
          }),
          previousAriaLabel: this.$tr('previousResults'),
          nextAriaLabel: this.$tr('nextResults'),
          previousButtonDisabled: this.previousButtonDisabled,
          nextButtonDisabled: this.nextButtonDisabled,
        };
      },
      previousButtonDisabled() {
        return this.currentPage === 1 || this.numFilteredItems === 0;
      },
      nextButtonDisabled() {
        return (
          this.totalPages === 1 ||
          this.currentPage === this.totalPages ||
          this.numFilteredItems === 0
        );
      },
    },
    watch: {
      visibleFilteredItems: {
        handler(newVal) {
          this.$emit('pageChanged', {
            page: this.currentPage,
            items: newVal,
          });
        },
        immediate: true,
      },
    },
    methods: {
      changePage(change) {
        // Clamp the newPage number between the bounds if browser doesn't correctly
        // disable buttons (see #6454 issue with old versions of MS Edge)
        this.currentPage = clamp(this.currentPage + change, 1, this.totalPages);
      },
    },
    $trs: {
      previousResults: {
        message: 'Previous results',
        context:
          'Text which indicates the previous page of results when a user makes a search query.\n',
      },
      nextResults: {
        message: 'Next results',
        context: 'Text which indicates the next page of results when a user makes a search query.',
      },
      pagination: {
        message:
          '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredItems, number }',
        context: "Refers to pagination. Only translate the word \"of''.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .text-filter {
    margin-top: 14px;
  }

</style>
