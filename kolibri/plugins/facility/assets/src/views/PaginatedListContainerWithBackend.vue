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
        <FilterTextbox v-model="filterInput" :placeholder="filterPlaceholder" />
      </KGridItem>
    </KGrid>

    <div>
      <slot
        :items="userList"
        :filterInput="filterInput"
      >
      </slot>
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

  import clamp from 'lodash/clamp';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import { FacilityUserResource } from 'kolibri.resources';
  import store from 'kolibri.coreVue.vuex.store';
  import { _userState } from '../modules/mappers';

  export default {
    name: 'PaginatedListContainerWithBackend',
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
      totalUsers: {
        type: Number,
        required: true,
      },
      roleFilter: {
        type: Object,
        required: false,
        default: null,
      },
      excludeMemberOf: {
        type: String,
        required: false,
        default: '',
      },
      userAssignmentType: {
        type: String,
        required: false,
        default: '',
      },
    },
    data() {
      return {
        filterInput: '',
        currentPage: 1,
        userList: this.items,
        totalPageNumbers: this.totalPageNumber,
        usersCount: this.totalUsers,
      };
    },
    computed: {
      numFilteredItems() {
        return this.usersCount;
      },
      startRange() {
        return (this.currentPage - 1) * this.itemsPerPage;
      },
      visibleStartRange() {
        // return this.currentPage;
        return Math.min(this.startRange + 1, this.numFilteredItems);
      },
      endRange() {
        return this.currentPage * this.itemsPerPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredItems);
      },
      previousButtonDisabled() {
        return this.currentPage === 1 || this.numFilteredItems === 0;
      },
      nextButtonDisabled() {
        return (
          this.totalPageNumbers === 1 ||
          this.currentPage === this.totalPageNumbers ||
          this.numFilteredItems === 0
        );
      },
    },
    watch: {
      filterInput: {
        handler() {
          this.currentPage = 1;
          this.get_users();
        },
      },
      roleFilter: {
        handler() {
          this.currentPage = 1;
          this.get_users();
        },
      },
      items: {
        handler() {
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
            page: this.currentPage,
            search: this.filterInput,
            exclude_member_of: !this.excludeMemberOf ? '' : this.excludeMemberOf,
            user_type:
              !this.roleFilter || this.roleFilter.value === 'all' ? '' : this.roleFilter.value,
            exclude_user_type: this.userAssignmentType === 'coaches' ? 'learner' : '',
          },
          force: true,
        }).then(
          users => {
            this.currentPage = users.page;
            this.userList = users.results.map(_userState);
            this.totalPageNumbers = users.total_pages;
            this.usersCount = users.count;
          },
          error => {
            // check if this error is raised by the api because of currentPage is more than
            // the total pages
            if (
              error.response.status === 404 &&
              error.response.data &&
              error.response.data[0].id === 'NOT_FOUND'
            ) {
              // set the currentPage to 1 and recall the api
              this.currentPage = 1;
              this.get_users();
            } else {
              store.dispatch('handleApiError', error);
            }
          }
        );
      },
      changePage(change) {
        // Clamp the newPage number between the bounds if browser doesn't correctly
        // disable buttons (see #6454 issue with old versions of MS Edge)
        this.currentPage = clamp(this.currentPage + change, 1, this.totalPageNumbers);
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
          '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredItems, number }',
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
