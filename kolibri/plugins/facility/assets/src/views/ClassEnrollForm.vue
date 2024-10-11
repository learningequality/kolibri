<template>

  <form>
    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :items="facilityUsers"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPages"
      :numFilteredItems="totalLearners"
    >
      <template #filter>
        <FilterTextbox
          v-model="search"
          :placeholder="coreString('searchForUser')"
        />
      </template>
      <template>
        <UserTable
          v-model="selectedUsers"
          :users="usersNotInClass"
          :selectable="true"
          :emptyMessage="emptyMessageForItems(usersNotInClass)"
          :showDemographicInfo="true"
        />
      </template>
    </PaginatedListContainerWithBackend>
    <SelectionBottomBar
      :count="selectedUsers.length"
      :disabled="disabled || selectedUsers.length === 0"
      :type="pageType"
      @click-confirm="$emit('submit', selectedUsers)"
    />
  </form>

</template>


<script>

  import { mapState } from 'vuex';
  import pickBy from 'lodash/pickBy';
  import debounce from 'lodash/debounce';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import UserTable from 'kolibri-common/components/UserTable';
  import PaginatedListContainerWithBackend from 'kolibri-common/components/PaginatedListContainerWithBackend';
  import SelectionBottomBar from './SelectionBottomBar';

  export default {
    name: 'ClassEnrollForm',
    components: {
      SelectionBottomBar,
      PaginatedListContainerWithBackend,
      UserTable,
      FilterTextbox,
    },
    mixins: [commonCoreStrings],
    props: {
      pageType: {
        type: String,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      totalPageNumber: {
        type: Number,
        required: false,
        default: 1,
      },
    },
    data() {
      return {
        selectedUsers: [],
      };
    },
    computed: {
      ...mapState('classAssignMembers', ['facilityUsers', 'totalLearners']),
      usersNotInClass() {
        return this.facilityUsers;
      },
      totalPages() {
        return this.totalPageNumber;
      },
      search: {
        get() {
          return this.$route.query.search || '';
        },
        set(value) {
          this.debouncedSearchTerm(value);
        },
      },
      currentPage: {
        get() {
          return Number(this.$route.query.page || 1);
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              page: value,
            }),
          });
        },
      },
      itemsPerPage: {
        get() {
          return this.$route.query.page_size || 30;
        },
        set(value) {
          this.$router.push({
            ...this.$route,
            query: pickBy({
              ...this.$route.query,
              page_size: value,
              page: null,
            }),
          });
        },
      },
    },
    created() {
      this.debouncedSearchTerm = debounce(this.emitSearchTerm, 500);
    },
    methods: {
      emptyMessageForItems() {
        if (this.facilityUsers.length === 0) {
          return this.coreString('noUsersExistLabel');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        return '';
      },
      emitSearchTerm(value) {
        if (value === '') {
          value = null;
        }
        this.$router.push({
          ...this.$route,
          query: pickBy({
            ...this.$route.query,
            search: value,
            page: null,
          }),
        });
      },
    },
    $trs: {
      // TODO clarify empty state messages after string freeze
      allUsersAlready: {
        message: 'All users are already enrolled in this class',
        context:
          'If all the users in a facility are already enrolled in a class, no more can be added.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .footer {
    display: flex;
    justify-content: flex-end;
  }

</style>
