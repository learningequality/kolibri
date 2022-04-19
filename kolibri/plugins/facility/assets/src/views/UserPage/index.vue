<template>

  <FacilityAppBarPage>
    <KPageContainer>
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <h1>{{ coreString('usersLabel') }}</h1>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <KRouterLink
            :text="$tr('newUserButtonLabel')"
            :primary="true"
            appearance="raised-button"
            class="move-down"
            :to="$store.getters.facilityPageLinks.UserCreatePage"
          />
        </KGridItem>
      </KGrid>

      <PaginatedListContainerWithBackend
        :items="facilityUsers"
        :filterPlaceholder="$tr('searchText')"
        :totalPageNumber="totalPages"
        :roleFilter="roleFilter"
        :totalUsers="usersCount"
      >
        <template #otherFilter>
          <KSelect
            v-model="roleFilter"
            :label="coreString('userTypeLabel')"
            :options="userKinds"
            :inline="true"
            class="type-filter"
          />
        </template>

        <template #default="{ items, filterInput }">
          <UserTable
            class="move-down user-roster"
            :users="items"
            :emptyMessage="emptyMessageForItems(items, filterInput)"
            :showDemographicInfo="true"
          >
            <template #action="userRow">
              <KDropdownMenu
                :text="$tr('optionsButtonLabel')"
                :options="manageUserOptions(userRow.user.id)"
                :disabled="!userCanBeEdited(userRow.user)"
                appearance="flat-button"
                @select="handleManageUserSelection($event, userRow.user)"
              />
            </template>
          </UserTable>
        </template>
      </PaginatedListContainerWithBackend>

      <!-- Modals -->

      <ResetUserPasswordModal
        v-if="modalShown === Modals.RESET_USER_PASSWORD"
        :id="selectedUser.id"
        :username="selectedUser.username"
        @cancel="closeModal"
      />

      <DeleteUserModal
        v-if="modalShown === Modals.DELETE_USER"
        :id="selectedUser.id"
        :username="selectedUser.username"
        @cancel="closeModal"
      />
    </KPageContainer>
  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapGetters } from 'vuex';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import cloneDeep from 'lodash/cloneDeep';
  import PaginatedListContainerWithBackend from '../PaginatedListContainerWithBackend';
  import UserTable from '../UserTable';
  import { Modals } from '../../constants';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import ResetUserPasswordModal from './ResetUserPasswordModal';
  import DeleteUserModal from './DeleteUserModal';

  const ALL_FILTER = 'all';

  export default {
    name: 'UserPage',
    metaInfo() {
      return {
        title: this.coreString('usersLabel'),
      };
    },
    components: {
      FacilityAppBarPage,
      ResetUserPasswordModal,
      DeleteUserModal,
      UserTable,
      PaginatedListContainerWithBackend,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        roleFilter: null,
        selectedUser: null,
        modalShown: null,
      };
    },
    computed: {
      ...mapGetters(['currentUserId', 'isSuperuser']),
      ...mapState('userManagement', ['facilityUsers', 'totalPages', 'usersCount']),
      Modals: () => Modals,
      userKinds() {
        return [
          { label: this.coreString('allLabel'), value: ALL_FILTER },
          { label: this.coreString('learnersLabel'), value: UserKinds.LEARNER },
          { label: this.coreString('coachesLabel'), value: UserKinds.COACH },
          { label: this.$tr('admins'), value: UserKinds.ADMIN },
          { label: this.$tr('superAdmins'), value: UserKinds.SUPERUSER },
        ];
      },
    },
    beforeMount() {
      this.roleFilter = this.userKinds[0];
    },
    methods: {
      emptyMessageForItems(items, filterText) {
        if (this.facilityUsers.length === 0) {
          return this.$tr('noUsersExist');
        } else if (this.roleFilter && filterText === '') {
          switch (this.roleFilter.value) {
            case UserKinds.LEARNER:
              return this.$tr('noLearnersExist');
            case UserKinds.COACH:
              return this.$tr('noCoachesExist');
            case UserKinds.ADMIN:
              return this.$tr('noAdminsExist');
            case UserKinds.SUPERUSER:
              return this.$tr('noSuperAdminsExist');
            default:
              return '';
          }
        } else if (items.length === 0) {
          return this.$tr('allUsersFilteredOut', { filterText });
        }
        return '';
      },
      closeModal() {
        this.modalShown = '';
      },
      manageUserOptions(userId) {
        return [
          { label: this.coreString('editDetailsAction'), value: Modals.EDIT_USER },
          { label: this.$tr('resetUserPassword'), value: Modals.RESET_USER_PASSWORD },
          {
            label: this.coreString('deleteAction'),
            value: Modals.DELETE_USER,
            disabled: userId === this.currentUserId,
          },
        ];
      },
      handleManageUserSelection(selection, user) {
        if (selection.value === Modals.EDIT_USER) {
          const link = cloneDeep(this.$store.getters.facilityPageLinks.UserEditPage);
          link.params.id = user.id;
          this.$router.push(link);
        } else {
          this.selectedUser = user;
          this.modalShown = selection.value;
        }
      },
      userCanBeEdited(user) {
        // If logged-in user is a superuser, then they can edit anybody (including other SUs).
        // Otherwise, only non-SUs can be edited.
        return this.isSuperuser || !user.is_superuser;
      },
    },
    $trs: {
      searchText: {
        message: 'Search for a user…',
        context: 'Refers to the search option on the user page.',
      },
      admins: {
        message: 'Admins',
        context: 'Refers to the list of admins in a facility.',
      },
      superAdmins: {
        message: 'Super admins',
        context: 'A user type.',
      },
      newUserButtonLabel: {
        message: 'New User',
        context: 'Button to create new user.',
      },
      noUsersExist: {
        message: 'No users exist',
        context: "Displayed when there are no users in the facility on the 'Users' page.",
      },
      allUsersFilteredOut: {
        message: "No users match the filter: '{filterText}'",
        context: "Refers to the 'Search for a user' filter when no users are found.",
      },
      optionsButtonLabel: {
        message: 'Options',
        context: 'User options button.',
      },
      resetUserPassword: {
        message: 'Reset password',
        context: "Option to reset a user's password.",
      },
      noLearnersExist: {
        message: 'There are no learners in this facility',
        context:
          "Displayed when there are no learners in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
      noCoachesExist: {
        message: 'There are no coaches in this facility',
        context:
          "Displayed when there are no coaches in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
      noSuperAdminsExist: {
        message: 'There are no super admins in this facility',
        context:
          "Displayed when there are no super admins in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
      noAdminsExist: {
        message: 'There are no admins in this facility',
        context:
          "Displayed when there are no admins in the facility. Seen when using the 'User type' filter on the 'Users' page.",
      },
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

  .user-roster {
    overflow-x: auto;
  }

</style>
