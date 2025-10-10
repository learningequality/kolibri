<template>

  <ImmersivePage
    :appBarTitle="newUsers$()"
    :route="$store.getters.facilityPageLinks.UserPage"
    :appearanceOverrides="{
      width: '100%',
      height: '100%',
      margin: '0px',
      padding: '0 1em',
    }"
  >
    <template #default="{ appBarHeight, pageContentHeight }">
      <div
        :style="{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1440px',
          margin: appBarHeight + 24 + 'px auto 0',
          maxHeight: pageContentHeight - appBarHeight - 24 + 'px',
          backgroundColor: $themeTokens.surface,
        }"
      >
        <div
          class="header-shadow"
          :style="headerStyles"
        >
          <KRouterLink
            :to="$store.getters.facilityPageLinks.UserPage"
            icon="back"
            style="margin: 0.5em 0 1em"
            :text="backToUsers$()"
          />

          <UsersTableToolbar>
            <template #topRow>
              <div class="top-row-left">
                <h1>{{ newUsers$() }}</h1>
                <FilterTextbox
                  v-if="facilityUsers.length"
                  ref="filterTextboxRef"
                  v-model="searchTerm"
                  class="search-box"
                  :placeholder="coreString('searchForUser')"
                  :aria-label="coreString('searchForUser')"
                />
                <KRouterLink
                  v-if="facilityUsers.length"
                  appearance="basic-link"
                  :text="numAppliedFilters ? numFilters$({ n: numAppliedFilters }) : filterLabel$()"
                  class="filter-button"
                  :to="
                    overrideRoute($route, { name: PageNames.FILTER_USERS_SIDE_PANEL__NEW_USERS })
                  "
                />
                <KButton
                  v-if="numAppliedFilters > 0"
                  appearance="basic-link"
                  :appearanceOverrides="{ color: $themeTokens.error }"
                  :text="clearFiltersLabel$()"
                  @click="resetFilters"
                />
              </div>
              <div class="users-page-header-actions">
                <KRouterLink
                  primary
                  appearance="raised-button"
                  :text="newUser$()"
                  :to="$store.getters.facilityPageLinks.UserCreatePage"
                />
              </div>
            </template>
            <template #bottomRow>
              <div class="bottom-row-left">
                <KIconButton
                  ref="assignButton"
                  icon="assignCoaches"
                  :ariaLabel="assignCoach$()"
                  :disabled="!canAssignCoaches || !hasSelectedUsers"
                  @click="navigateToSidePanel(PageNames.ASSIGN_COACHES_SIDE_PANEL__NEW_USERS)"
                />
                <KTooltip
                  reference="assignButton"
                  :refs="$refs"
                  :text="assignCoach$()"
                />
                <KIconButton
                  ref="enrollButton"
                  icon="add"
                  :ariaLabel="enrollToClass$()"
                  :disabled="!canEnrollOrRemoveFromClass || !hasSelectedUsers"
                  @click="navigateToSidePanel(PageNames.ENROLL_LEARNERS_SIDE_PANEL__NEW_USERS)"
                />
                <KTooltip
                  reference="enrollButton"
                  :refs="$refs"
                  :text="enrollToClass$()"
                />
                <KIconButton
                  ref="removeButton"
                  icon="remove"
                  :ariaLabel="removeFromClass$()"
                  :disabled="!canEnrollOrRemoveFromClass || !hasSelectedUsers"
                  @click="navigateToSidePanel(PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL__NEW_USERS)"
                />
                <KTooltip
                  reference="removeButton"
                  :refs="$refs"
                  :text="removeFromClass$()"
                />
                <KIconButton
                  ref="trashButton"
                  icon="trash"
                  :ariaLabel="deleteSelection$()"
                  :disabled="!canDeleteSelection || !hasSelectedUsers"
                  @click="isMoveToTrashModalOpen = true"
                />
                <KTooltip
                  reference="trashButton"
                  :refs="$refs"
                  :text="deleteSelection$()"
                />
                <div
                  v-if="hasSelectedUsers"
                  class="selection-status"
                >
                  <span>{{ numUsersSelected$({ n: selectedUsers.size }) }}</span>
                  <KButton
                    appearance="basic-link"
                    :text="coreString('clearAction')"
                    @click="clearSelectedUsers"
                  />
                </div>
              </div>
              <PaginationActions
                v-model="currentPage"
                :itemsPerPage="itemsPerPage"
                :totalPageNumber="totalPages"
                :numFilteredItems="usersCount"
              />
            </template>
          </UsersTableToolbar>
        </div>
        <UsersTable
          v-if="showUsersTable"
          class="users-table"
          :facilityUsers="facilityUsers"
          :dataLoading="dataLoading"
          :selectedUsers.sync="selectedUsers"
          @clearSelectedUsers="clearSelectedUsers"
          @change="onChange"
        />
        <div
          v-else
          class="empty-new-users"
        >
          <div class="empty-new-users-content">
            <KImg
              isDecorative
              :src="emptyPlusCloudSvg"
              backgroundColor="transparent"
            />
            <strong> {{ noNewUsersLabel$() }}</strong>
            <p
              :style="{
                color: $themePalette.grey.v_700,
              }"
            >
              {{ noNewUsersDescription$() }}
            </p>
          </div>
          <KRouterLink
            primary
            appearance="raised-button"
            :text="addNewUserLabel$()"
            :to="$store.getters.facilityPageLinks.UserCreatePage"
          />
        </div>
      </div>
      <!-- For sidepanels -->
      <router-view
        :backRoute="overrideRoute($route, { name: PageNames.NEW_USERS_PAGE })"
        :classes="classes"
        :selectedUsers="selectedUsers"
        :onBlur="onModalBlur"
        :onChange="onChange"
      />

      <!-- Modals -->
      <MoveToTrashModal
        v-if="isMoveToTrashModalOpen"
        :selectedUsers="selectedUsers"
        :onBlur="onModalBlur"
        :onChange="onChange"
        @close="isMoveToTrashModalOpen = false"
      />
    </template>
  </ImmersivePage>

</template>


<script>

  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import PaginationActions from 'kolibri-common/components/PaginationActions';
  import store from 'kolibri/store';
  import { computed, onMounted, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  import { UserKinds } from 'kolibri/constants';
  import useUsersTableSearch from '../../composables/useUsersTableSearch';
  import usePagination from '../../composables/usePagination';
  import useUserManagement from '../../composables/useUserManagement';
  import emptyPlusCloudSvg from '../../images/empty_plus_cloud.svg';
  import { PageNames } from '../../constants';
  import { overrideRoute } from '../../utils';
  import UsersTable from './common/UsersTable.vue';
  import UsersTableToolbar from './common/UsersTableToolbar';
  import MoveToTrashModal from './common/MoveToTrashModal.vue';

  // Constant for the maximum number of days to consider a user as a "new user"
  const MAX_NEW_USER_DAYS = 30;

  export default {
    name: 'NewUsersPage',
    components: {
      UsersTable,
      UsersTableToolbar,
      ImmersivePage,
      MoveToTrashModal,
      FilterTextbox,
      PaginationActions,
    },
    mixins: [commonCoreStrings],
    setup() {
      usePreviousRoute();
      const route = useRoute();
      const router = useRouter();
      const { currentUserId, isSuperuser, isAdmin } = useUser();
      const isMoveToTrashModalOpen = ref(false);

      const activeFacilityId = route.params.facility_id || store.getters.activeFacilityId;

      const newUsersCreationTreshold = new Date();
      newUsersCreationTreshold.setDate(newUsersCreationTreshold.getDate() - MAX_NEW_USER_DAYS);

      const {
        selectedUsers,
        facilityUsers,
        search,
        classes,
        totalPages,
        usersCount,
        dataLoading,
        numAppliedFilters,
        onChange,
        fetchClasses,
        resetFilters,
      } = useUserManagement({
        activeFacilityId,
        dateJoinedGt: newUsersCreationTreshold,
      });

      const showUsersTable = computed(
        () =>
          facilityUsers.value.length > 0 ||
          search.value?.length > 0 ||
          numAppliedFilters.value > 0 ||
          dataLoading.value,
      );

      // Use our new composables
      const { searchTerm, filterTextboxRef } = useUsersTableSearch();
      const { currentPage, itemsPerPage } = usePagination({ usersCount, totalPages });

      const {
        newUser$,
        newUsers$,
        backToUsers$,
        assignCoach$,
        enrollToClass$,
        removeFromClass$,
        deleteSelection$,
        noNewUsersLabel$,
        addNewUserLabel$,
        noNewUsersDescription$,
        numFilters$,
        filterLabel$,
        numUsersSelected$,
        clearFiltersLabel$,
      } = bulkUserManagementStrings;

      function clearSelectedUsers() {
        selectedUsers.value = new Set();
      }

      function onModalBlur() {
        selectedUsers.value.clear();
        selectedUsers.value = new Set(selectedUsers.value);
      }

      function navigateToSidePanel(sidePanelName) {
        const newRoute = overrideRoute(route, { name: sidePanelName });
        router.push(newRoute);
      }

      onMounted(() => {
        fetchClasses();
      });

      return {
        // Route utilities
        overrideRoute,
        PageNames,

        // Table data
        classes,
        facilityUsers,
        totalPages,
        usersCount,
        dataLoading,
        selectedUsers,
        showUsersTable,
        emptyPlusCloudSvg,
        numAppliedFilters,
        isMoveToTrashModalOpen,

        // Search functionality from composable
        searchTerm,
        filterTextboxRef,

        // Pagination from composable
        currentPage,
        itemsPerPage,

        // Methods
        onChange,
        onModalBlur,
        clearSelectedUsers,
        navigateToSidePanel,
        resetFilters,

        // Strings
        newUser$,
        newUsers$,
        backToUsers$,
        assignCoach$,
        enrollToClass$,
        removeFromClass$,
        deleteSelection$,
        noNewUsersLabel$,
        addNewUserLabel$,
        noNewUsersDescription$,
        numFilters$,
        filterLabel$,
        numUsersSelected$,
        clearFiltersLabel$,

        // User info
        currentUserId,
        isSuperuser,
        isAdmin,
      };
    },
    computed: {
      hasSelectedUsers() {
        return this.selectedUsers && this.selectedUsers.size > 0;
      },
      listContainsLoggedInUser() {
        return this.selectedUsers.has(this.currentUserId);
      },
      canAssignCoaches() {
        if (!this.hasSelectedUsers) return false;
        return this.facilityUsers
          .filter(user => this.selectedUsers.has(user.id))
          .some(
            user =>
              user.kind.includes(UserKinds.COACH) ||
              user.kind === UserKinds.ADMIN ||
              user.kind === UserKinds.SUPERUSER ||
              user.is_superuser,
          );
      },
      canEnrollOrRemoveFromClass() {
        if (!this.hasSelectedUsers) return false;
        return this.facilityUsers
          .filter(user => this.selectedUsers.has(user.id))
          .every(
            user =>
              user.kind === UserKinds.LEARNER ||
              user.kind.includes(UserKinds.COACH) ||
              user.kind === UserKinds.ADMIN ||
              user.kind === UserKinds.SUPERUSER ||
              user.is_superuser,
          );
      },
      hasSelectedSuperusers() {
        if (!this.hasSelectedUsers || !this.facilityUsers) return false;

        return this.facilityUsers
          .filter(user => this.selectedUsers.has(user.id))
          .some(user => {
            const isSuperuser = user.kind === UserKinds.SUPERUSER || user.is_superuser === true;
            return isSuperuser;
          });
      },
      canDeleteSelection() {
        if (!this.hasSelectedUsers) return false;
        if (this.listContainsLoggedInUser) return false;
        if (this.isSuperuser) return true;
        if (this.isAdmin) {
          return !this.hasSelectedSuperusers;
        }
        return false;
      },
      headerStyles() {
        return {
          padding: '16px',
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .users-page-header-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    align-items: center;
    justify-content: flex-end;
  }

  .header-shadow {
    z-index: 8;
    box-shadow: 0 4px 4px -4px rgba(0, 0, 0, 0.8);
  }

  .top-row-left {
    display: flex;
    flex: 1;
    gap: 1em;
    align-items: center;

    h1 {
      margin: 0;
      white-space: nowrap;
    }
  }

  .search-box {
    flex: 1;
    width: 100% !important;
    max-width: 400px;
  }

  .filter-button {
    white-space: nowrap;
  }

  .bottom-row-left {
    display: flex;
    gap: 0.25em;
    align-items: center;

    .selection-status {
      display: flex;
      gap: 0.5em;
      align-items: center;
    }
  }

  .empty-new-users {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 24px;
    text-align: center;

    .empty-new-users-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;

      strong {
        margin-top: 16px;
        font-size: 16px;
      }

      p {
        margin: 8px 0;
        font-size: 14px;
      }
    }
  }

  /deep/ .main-wrapper {
    // The default padding causes root scroll which defeats
    // the purpose of our maxHeight style on the KPageContainer.
    // Uses !important because the overridden style is inline
    padding-bottom: 0 !important;
  }

</style>
