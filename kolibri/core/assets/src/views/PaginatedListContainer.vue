<template>

  <div>
    <KGrid>
      <KGridItem :layout12="{ span: 7 }">
        <slot name="otherFilter"></slot>
      </KGridItem>
      <KGridItem
        :layout12="{ span: 5, alignment: 'right' }"
        class="text-filter"
      >
        <FilterTextbox
          v-model="filterInput"
          :placeholder="filterPlaceholder"
        />
      </KGridItem>
    </KGrid>

    <div>
      <slot :items="initialUsersList"></slot>
    </div>

    <nav class="pagination-nav">
      <span dir="auto" class="pagination-label">
        {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredItems }) }}
      </span>
      <KButtonGroup>
        <KIconButton
          :ariaLabel="$tr('previousResults')"
          :disabled="previousButtonDisabled"
          size="small"

          icon="back"
          @click="changePage(-1)"
        />
        <KIconButton
          :ariaLabel="$tr('nextResults')"
          :disabled="nextButtonDisabled"
          size="small"

          icon="forward"
          @click="changePage(+1)"
        />
      </KButtonGroup>
    </nav>
  </div>

</template>


<script>

  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import { FacilityUserResource } from 'kolibri.resources';
  import store from 'kolibri.coreVue.vuex.store';

  export default {
    name: 'PaginatedListContainer',
    components: {
      FilterTextbox,
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
      totalPageNumber: {
        type: Number,
        required: false,
        default: 1,
      },
      roleFilter: {
        type: Object,
        required: false,
      },
      excludeMemberOf: {
        type: String,
        required: false,
      },
      userAssignmentType: {
        type: String,
        required: false,
      },
    },
    data() {
      return {
        filterInput: '',
        currentPage: 1,
        currentPageNumber: 1,
        userList: this.items,
        totalPageNumbers: this.totalPageNumber,
        totalItems: this.items.length,
      };
    },
    computed: {
      initialUsersList() {
        return this.userList;
      },
      numFilteredItems() {
        return this.totalPageNumbers;
      },
      totalPages() {
        return Math.ceil(this.numFilteredItems / this.itemsPerPage);
      },
      startRange() {
        return (this.currentPage - 1) * this.itemsPerPage;
      },
      visibleStartRange() {
        return this.currentPageNumber;
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
        return this.currentPageNumber === 1 || this.numFilteredItems === 0;
      },
      nextButtonDisabled() {
        return (
          this.totalPageNumbers === 1 ||
          this.currentPageNumber === this.totalPageNumbers ||
          this.numFilteredItems === 0
        );
      },
    },
    watch: {
      filterInput: {
        handler() {
          this.currentPageNumber = 1;
          this.get_users();
        },
      },
      roleFilter: {
        handler() {
          this.currentPageNumber = 1;
          this.get_users();
        },
      },
    },
    methods: {
      get_users() {
        const facilityId = store.getters.activeFacilityId;
        FacilityUserResource.fetchCollection({
          getParams: {
            member_of: facilityId,
            page_size: this.itemsPerPage,
            page: this.currentPageNumber,
            search: this.filterInput,
            exclude_member_of: !this.excludeMemberOf ? '' : this.excludeMemberOf,
            user_type:
              !this.roleFilter || this.roleFilter.value === 'all' ? '' : this.roleFilter.value,
            exclude_user_type: this.userAssignmentType === 'coaches' ? 'learner' : '',
          },
          force: true,
        }).then(
          users => {
            this.currentPageNumber = users.page;
            this.userList = users.results;
            this.totalPageNumbers = users.total_pages;
            this.totalItems = users.count;
          },
          error => {
            store.dispatch('handleApiError', error);
          }
        );
      },
      changePage(change) {
        this.currentPageNumber += change;
        this.get_users();
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
          //   '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredItems, number }',
          // context: "Refers to pagination. Only translate the word \"of''.",
          'Page { visibleStartRange, number } of { numFilteredItems, number }',
        context: "Refers to pagination. Only translate the word \"of''.",
      },
    },
  };

</script>


<style lang="scss" scoped>

  .pagination-nav {
    margin-bottom: 8px;
    text-align: right;
  }

  .text-filter {
    margin-top: 14px;
  }

  .pagination-label {
    position: relative;
    top: -2px;
    display: inline;
  }

</style>
