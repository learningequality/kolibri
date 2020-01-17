<template>

  <div>
    <KGrid>
      <KGridItem :layout12="{ span: 3 }">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 9, alignment: 'right' }"
        class="text-filter"
      >
        <FilterTextbox
          v-model="filterInput"
          :placeholder="filterPlaceholder"
        />
      </KGridItem>
    </KGrid>

    <div>
      <slot v-bind="{ items: visibleFilteredItems, filterInput }"></slot>
    </div>

    <nav>
      <span dir="auto" class="pagination-label">
        {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredItems }) }}
      </span>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('previousResults')"
        :disabled="previousButtonDisabled"
        size="small"
        class="pagination-button"
        @click="changePage(-1)"
      >
        <KIcon icon="back" class="arrow-icon" />
      </UiIconButton>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('nextResults')"
        :disabled="nextButtonDisabled"
        size="small"
        class="pagination-button"
        @click="changePage(+1)"
      >
        <KIcon icon="forward" class="arrow-icon" />
      </UiIconButton>
    </nav>
  </div>

</template>


<script>

  import clamp from 'lodash/clamp';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';

  export default {
    name: 'PaginatedListContainer',
    components: {
      UiIconButton,
      FilterTextbox,
    },
    props: {
      // The entire list of items
      items: {
        type: Array,
        required: true,
      },
      filterFunction: {
        type: Function,
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
    },
    data() {
      return {
        filterInput: '',
        currentPage: 1,
      };
    },
    computed: {
      filteredItems() {
        if (this.filterFunction) {
          return this.filterFunction(this.items, this.filterInput);
        }
        return this.items;
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
      numFilteredItems: {
        handler() {
          this.currentPage = 1;
          this.$emit('pageChanged', 1);
        },
      },
    },
    methods: {
      changePage(change) {
        // Clamp the newPage number between the bounds if browser doesn't correctly
        // disable buttons (see #6454 issue with old versions of MS Edge)
        this.currentPage = clamp(this.currentPage + change, 1, this.totalPages);
        this.$emit('pageChanged', this.currentPage);
      },
    },
    $trs: {
      previousResults: 'Previous results',
      nextResults: 'Next results',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredItems, number }',
    },
  };

</script>


<style lang="scss" scoped>

  .actions-header,
  nav {
    text-align: right;
  }

  .pagination-button {
    margin-left: 8px;
  }

  .text-filter {
    margin-top: 14px;
  }

  .arrow-icon {
    position: relative;
    top: -1px;
  }

</style>
