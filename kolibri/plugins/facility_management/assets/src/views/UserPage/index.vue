<template>

  <div>
    <KGrid>
      <KGridItem sizes="100, 50, 50" percentage>
        <h1>{{ $tr('users') }}</h1>
      </KGridItem>
      <KGridItem sizes="100, 50, 50" percentage align="right">
        <KButton
          :text="$tr('newUserButtonLabel')"
          :primary="true"
          class="move-down"
          @click="$router.push($router.getRoute('USER_CREATE_PAGE'))"
        />
      </KGridItem>
      <KGridItem sizes="3, 3, 3">
        <KSelect
          v-model="roleFilter"
          :label="$tr('filterUserType')"
          :options="userKinds"
          :inline="true"
          class="type-filter"
        />
      </KGridItem>
      <KGridItem sizes="4, 5, 5">
        <KFilterTextbox
          v-model="searchFilter"
          :placeholder="$tr('searchText')"
          class="user-filter"
        />
      </KGridItem>
    </KGrid>

    <UserTable class="user-roster move-down" :users="visibleUsers" :emptyMessage="emptyMessage">
      <template slot="action" slot-scope="userRow">
        <KDropdownMenu
          :text="$tr('optionsButtonLabel')"
          :options="manageUserOptions(userRow.user.id)"
          :disabled="!userCanBeEdited(userRow.user)"
          appearance="flat-button"
          @select="handleManageUserSelection($event, userRow.user)"
        />
      </template>
    </UserTable>

    <nav>
      <span dir="auto">
        {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredUsers }) }}
      </span>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('previousResults')"
        :disabled="pageNum === 1"
        size="small"
        class="pagination-button"
        @click="goToPage(pageNum - 1)"
      >
        <KIcon icon="back" style="position: relative; top: -1px;" />
      </UiIconButton>
      <UiIconButton
        type="primary"
        :ariaLabel="$tr('nextResults')"
        :disabled="pageNum === 0 || pageNum === numPages"
        size="small"
        class="pagination-button"
        @click="goToPage(pageNum + 1)"
      >
        <KIcon icon="forward" style="position: relative; top: -1px;" />
      </UiIconButton>
    </nav>

    <!-- Modals -->

    <EditUserModal
      v-if="modalShown===Modals.EDIT_USER"
      :id="selectedUser.id"
      :name="selectedUser.full_name"
      :username="selectedUser.username"
      :kind="selectedUser.kind"
      @cancel="closeModal"
    />

    <ResetUserPasswordModal
      v-if="modalShown===Modals.RESET_USER_PASSWORD"
      :id="selectedUser.id"
      :username="selectedUser.username"
      @cancel="closeModal"
    />

    <DeleteUserModal
      v-if="modalShown===Modals.DELETE_USER"
      :id="selectedUser.id"
      :username="selectedUser.username"
      @cancel="closeModal"
    />
  </div>

</template>


<script>

  import { mapActions, mapState, mapGetters } from 'vuex';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import KDropdownMenu from 'kolibri.coreVue.components.KDropdownMenu';
  import KSelect from 'kolibri.coreVue.components.KSelect';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import UserTable from '../UserTable';
  import { Modals } from '../../constants';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';
  import EditUserModal from './EditUserModal';
  import ResetUserPasswordModal from './ResetUserPasswordModal';
  import DeleteUserModal from './DeleteUserModal';

  const ALL_FILTER = 'all';

  export default {
    name: 'UserPage',
    metaInfo() {
      return {
        title: this.$tr('userPageTitle'),
      };
    },
    components: {
      EditUserModal,
      ResetUserPasswordModal,
      DeleteUserModal,
      KButton,
      KFilterTextbox,
      KDropdownMenu,
      KIcon,
      KSelect,
      KGrid,
      KGridItem,
      UserTable,
      UiIconButton,
    },
    data() {
      return {
        searchFilter: '',
        roleFilter: null,
        selectedUser: null,
        perPage: 10,
        pageNum: 1,
      };
    },
    computed: {
      ...mapGetters(['currentUserId', 'isSuperuser']),
      ...mapState('userManagement', ['facilityUsers', 'modalShown']),
      Modals: () => Modals,
      userKinds() {
        return [
          { label: this.$tr('allUsers'), value: ALL_FILTER },
          { label: this.$tr('learners'), value: UserKinds.LEARNER },
          { label: this.$tr('coaches'), value: UserKinds.COACH },
          { label: this.$tr('admins'), value: UserKinds.ADMIN },
        ];
      },
      sortedFilteredUsers() {
        return filterAndSortUsers(
          this.facilityUsers,
          user => userMatchesFilter(user, this.searchFilter) && this.userMatchesRole(user)
        );
      },
      visibleUsers() {
        return this.sortedFilteredUsers.slice(this.startRange, this.endRange);
      },
      emptyMessage() {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        } else if (this.visibleUsers.length === 0) {
          return this.$tr('allUsersFilteredOut');
        }
        return '';
      },
      numPages() {
        return Math.ceil(this.numFilteredUsers / this.perPage);
      },
      startRange() {
        return (this.pageNum - 1) * this.perPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredUsers);
      },
      endRange() {
        return this.pageNum * this.perPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredUsers);
      },
      numFilteredUsers() {
        return this.sortedFilteredUsers.length;
      },
    },
    watch: {
      searchFilter() {
        // Reset the pageNum to the first page when searchFilter changes
        // to avoid showing an empty page.
        this.pageNum = 1;
      },
    },
    beforeMount() {
      this.roleFilter = this.userKinds[0];
    },
    methods: {
      ...mapActions('userManagement', ['displayModal']),
      closeModal() {
        this.displayModal(false);
      },
      userMatchesRole(user) {
        const { value: filterKind } = this.roleFilter;
        if (filterKind === ALL_FILTER) {
          return true;
        }
        if (user.kind === UserKinds.ASSIGNABLE_COACH) {
          return filterKind === UserKinds.COACH;
        }
        if (filterKind === UserKinds.ADMIN) {
          return user.kind === UserKinds.ADMIN || user.kind === UserKinds.SUPERUSER;
        }
        return filterKind === user.kind;
      },
      manageUserOptions(userId) {
        return [
          { label: this.$tr('editUser'), value: Modals.EDIT_USER },
          { label: this.$tr('resetUserPassword'), value: Modals.RESET_USER_PASSWORD },
          {
            label: this.$tr('deleteUser'),
            value: Modals.DELETE_USER,
            disabled: userId === this.currentUserId,
          },
        ];
      },
      goToPage(page) {
        this.pageNum = page;
      },
      handleManageUserSelection(selection, user) {
        this.selectedUser = user;
        this.displayModal(selection.value);
      },
      userCanBeEdited(user) {
        // If logged-in user is a superuser, then they can edit anybody (including other SUs).
        // Otherwise, only non-SUs can be edited.
        return this.isSuperuser || !user.is_superuser;
      },
    },
    $trs: {
      filterUserType: 'User type',
      searchText: 'Search for a user…',
      allUsers: 'All',
      admins: 'Admins',
      coaches: 'Coaches',
      learners: 'Learners',
      newUserButtonLabel: 'New User',
      userCountLabel: '{userCount} users',
      fullName: 'Full name',
      users: 'Users',
      role: 'Role',
      username: 'Username',
      edit: 'Edit',
      noUsersExist: 'No users exist',
      allUsersFilteredOut: 'No users match the filter',
      optionsButtonLabel: 'Options',
      editUser: 'Edit details',
      resetUserPassword: 'Reset password',
      deleteUser: 'Delete',
      userActions: 'User management actions',
      userPageTitle: 'Users',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredUsers, number }',
      previousResults: 'Previous results',
      nextResults: 'Next results',
    },
  };

</script>


<style lang="scss" scoped>

  .move-down {
    position: relative;
    margin-top: 24px;
  }

  .type-filter {
    margin-bottom: 0;
  }

  .user-filter {
    width: 100%;
    margin-top: 14px;
  }

  .user-roster {
    overflow-x: auto;
  }
  .actions-header,
  .footer,
  nav {
    text-align: end;
  }
  .pagination-button {
    margin-left: 8px;
  }

</style>
