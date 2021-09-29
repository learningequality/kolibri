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
      <slot v-bind="{ items: visibleFilteredItems, filterInput }"></slot>
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
  import filterUsersByNames from 'kolibri.utils.filterUsersByNames';
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
        required: true,
      },
      currentPageNumber: {
        type: Number,
        required: true,
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
        const facilityId = store.getters.activeFacilityId;
        FacilityUserResource.fetchCollection({
          getParams: {
            member_of: facilityId,
            page_size: 30,
            search: this.filterInput,
          },
          force: true,
        }).then(
          users => {
            this.currentPageNumber = users.page;
            this.items = users.results;
            this.totalPageNumber = users.total_pages;
          },
          error => {
            store.dispatch('handleApiError', error);
          }
        );
        return filterUsersByNames(this.items, this.filterInput);
      },
      numFilteredItems() {
        return this.totalPageNumber;
      },
      totalPages() {
        return this.total_pages;
        return Math.ceil(this.numFilteredItems / this.itemsPerPage);
      },
      startRange() {
        return (this.currentPage - 1) * this.itemsPerPage;
      },
      visibleStartRange() {
        return this.currentPageNumber;
        return Math.min(this.startRange + 1, this.numFilteredItems);
      },
      endRange() {
        return this.currentPage * this.itemsPerPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredItems);
      },
      visibleFilteredItems() {
        console.log(1);
        return this.filteredItems.slice(this.startRange, this.endRange);
      },
      previousButtonDisabled() {
        return this.currentPageNumber === 1 || this.numFilteredItems === 0;
      },
      nextButtonDisabled() {
        return (
          this.totalPages === 1 ||
          this.currentPageNumber === this.totalPageNumber ||
          this.numFilteredItems === 0
        );
      },
    },
    // watch: {
    //   visibleFilteredItems: {
    //     handler(newVal) {
    //       console.log(newVal);
    //       this.$emit('pageChanged', {
    //         page: this.currentPage,
    //         items: newVal,
    //       });
    //     },
    //     immediate: true,
    //   },
    // },
    methods: {
      changePage(change) {
        const facilityId = store.getters.activeFacilityId;
        FacilityUserResource.fetchCollection({
          getParams: {
            member_of: facilityId,
            page_size: 30,
            page: this.currentPageNumber + change,
          },
          force: true,
        }).then(
          users => {
            this.currentPageNumber = users.page;
            this.items = users.results;
          },
          error => {
            store.dispatch('handleApiError', error);
          }
        );

        // this.items = [
        //   {
        //     id: '00015fd69777c038d748eb294c362bd4',
        //     username: 'checktest',
        //     full_name: 'user19962',
        //     facility: '78415936a1cb642db556db8a59371619',
        //     id_number: '',
        //     gender: '',
        //     birth_year: '',
        //     is_superuser: false,
        //     roles: [],
        //   },
        //   {
        //     id: '0005d91ebec0af167a080e9b577a2e6a',
        //     username: 'kkdfjkasld',
        //     full_name: 'user23425',
        //     facility: '78415936a1cb642db556db8a59371619',
        //     id_number: '',
        //     gender: '',
        //     birth_year: '',
        //     is_superuser: false,
        //     roles: [],
        //   },
        // ];
        // Clamp the newPage number between the bounds if browser doesn't correctly
        // disable buttons (see #6454 issue with old versions of MS Edge)
        // this.currentPageNumber = clamp(this.currentPageNumber + change, 1, this.totalPageNumber);
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
