<template>

  <form>

    <PaginatedListContainerWithBackend
      v-model="currentPage"
      :items="usersNotInClass"
      :itemsPerPage="itemsPerPage"
      :totalPageNumber="totalPages"
      :numFilteredItems="totalUsers"
    >
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

  import pickBy from 'lodash/pickBy';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PaginatedListContainerWithBackend from './PaginatedListContainerWithBackend';
  import SelectionBottomBar from './SelectionBottomBar';
  import UserTable from './UserTable';

  export default {
    name: 'ClassEnrollForm',
    components: {
      SelectionBottomBar,
      PaginatedListContainerWithBackend,
      UserTable,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      facilityUsers: {
        type: Array,
        required: true,
      },
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
      totalUsers: {
        type: Number,
        required: false,
        default: 0,
      },
    },
    data() {
      return {
        selectedUsers: [],
      };
    },
    computed: {
      usersNotInClass() {
        return this.facilityUsers;
      },
      totalPages() {
        return this.totalPageNumber;
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
