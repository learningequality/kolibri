<template>

  <ImmersivePage
    :appBarTitle="newUsers$()"
    :route="$store.getters.facilityPageLinks.UserPage"
    :appearanceOverrides="{
      width: '100%',
      height: '100%',
      padding: windowIsSmall ? '0 0.5em' : '0 1em',
    }"
  >
    <template #default="{ pageContentHeight }">
      <!--
      There's some wonky looking math here for styles that basically:
      Center the content & pad it appropriately against the screen & appbar.
      This works for the ImmersivePage specifically and sets the content
      container at ~0.5em padding on small screens and 1em otherwise
      -->
      <KPageContainer :style="getPageContainerStyles(pageContentHeight)">
        <div
          :style="{
            backgroundColor: $themeTokens.surface,
          }"
        >
          <KRouterLink
            :to="$store.getters.facilityPageLinks.UserPage"
            icon="back"
            style="margin: 1em 0 0.25em"
            :text="backToUsers$()"
          />

          <UsersTableToolbar
            :title="newUsers$()"
            :hasSelectedUsers="hasSelectedUsers"
            :showUsersTable="showUsersTable"
          >
            <template #headerActions>
              <KRouterLink
                primary
                appearance="raised-button"
                :text="newUser$()"
                :to="$store.getters.facilityPageLinks.UserCreatePage"
              />
            </template>
            <template #searchbox>
              <FilterTextbox
                ref="filterTextboxRef"
                v-model="searchTerm"
                class="search-box"
                :placeholder="coreString('searchForUser')"
                :aria-label="coreString('searchForUser')"
              />
            </template>

            <template #filterLink>
              <KRouterLink
                appearance="basic-link"
                :text="
                  numAppliedFilters ? numFilters$({ n: numAppliedFilters }) : coreString('filter')
                "
                class="filter-button"
                :to="overrideRoute($route, { name: PageNames.FILTER_USERS_SIDE_PANEL__NEW_USERS })"
              />
            </template>
            <template #clearFiltersButton>
              <KButton
                v-if="numAppliedFilters > 0"
                appearance="basic-link"
                :appearanceOverrides="{ color: $themeTokens.error }"
                :text="clearFiltersLabel$()"
                @click="resetFilters"
              />
            </template>
            <template #selectionInfo>
              <span
                :style="{
                  color: $themeTokens.annotation,
                }"
              >{{ numUsersSelected$({ n: selectedUsers.size }) }}</span>
              <KButton
                appearance="basic-link"
                :text="coreString('clearSelectionAction')"
                @click="clearSelectedUsers"
              />
            </template>
            <template #userActions>
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
                :ariaLabel="enrollInClass$()"
                :disabled="!canEnrollOrRemoveFromClass || !hasSelectedUsers"
                @click="navigateToSidePanel(PageNames.ENROLL_LEARNERS_SIDE_PANEL__NEW_USERS)"
              />
              <KTooltip
                reference="enrollButton"
                :refs="$refs"
                :text="enrollInClass$()"
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
            </template>
            <template #paginationControls>
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
          :style="usersTableStyles"
          :facilityUsers="facilityUsers"
          :dataLoading="dataLoading"
          :selectedUsers.sync="selectedUsers"
          :numAppliedFilters="numAppliedFilters"
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
            :text="createNewUserLabel$()"
            :to="$store.getters.facilityPageLinks.UserCreatePage"
          />
        </div>
      </KPageContainer>
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
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useUsersTableSearch from '../../composables/useUsersTableSearch';
  import usePagination from '../../composables/usePagination';
  import useUserManagement from '../../composables/useUserManagement';
  import emptyPlusCloudSvg from '../../images/empty_plus_cloud.svg';
  import { PageNames } from '../../constants';
  import { overrideRoute } from '../../utils';
  import UsersTable from './common/UsersTable.vue';
  import UsersTableToolbar from './common/UsersTableToolbar/index.vue';
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

      const { windowIsSmall, windowIsShort } = useKResponsiveWindow();

      const showUsersTable = computed(
        () =>
          facilityUsers.value.length > 0 ||
          search.value?.length > 0 ||
          numAppliedFilters.value > 0 ||
          dataLoading.value,
      );

      const usersTableStyles = computed(() => {
        if (windowIsSmall.value && facilityUsers.value.length > 0) {
          // If window is small, these negative margins removes the padding added by
          // the ImmersivePage container to make the table full-bleed horizontally
          return {
            marginLeft: '-16px',
            marginRight: '-16px',
          };
        }
        return {};
      });

      // Use our new composables
      const { searchTerm, filterTextboxRef } = useUsersTableSearch();
      const { currentPage, itemsPerPage } = usePagination({ usersCount, totalPages });

      const {
        newUser$,
        newUsers$,
        backToUsers$,
        assignCoach$,
        enrollInClass$,
        removeFromClass$,
        deleteSelection$,
        noNewUsersLabel$,
        createNewUserLabel$,
        noNewUsersDescription$,
        numFilters$,
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

      const shouldCropUsersTable = computed(() => !windowIsShort.value);

      function getPageContainerMaxHeight(pageContentHeight) {
        if (!shouldCropUsersTable.value) {
          return 'None';
        }
        const maxHeight = pageContentHeight - (windowIsSmall.value ? 70 : 96);
        return maxHeight + 'px';
      }

      function getPageContainerStyles(pageContentHeight) {
        // TODO: This should refer to the actual appbar height
        const marginTop = windowIsSmall.value ? 64 : 80;
        // If table is not cropped, add some bottom margin to prevent the table from
        // touching the bottom edge
        const marginBottom = shouldCropUsersTable.value ? 0 : 16;

        return {
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1440px',
          margin: `${marginTop}px auto ${marginBottom}px`,
          maxHeight: getPageContainerMaxHeight(pageContentHeight),
        };
      }

      onMounted(() => {
        fetchClasses();
      });

      return {
        usersTableStyles,
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
        getPageContainerStyles,

        // Strings
        newUser$,
        newUsers$,
        backToUsers$,
        assignCoach$,
        enrollInClass$,
        removeFromClass$,
        deleteSelection$,
        noNewUsersLabel$,
        createNewUserLabel$,
        noNewUsersDescription$,
        numFilters$,
        numUsersSelected$,
        clearFiltersLabel$,

        // User info
        currentUserId,
        isSuperuser,
        isAdmin,

        windowIsSmall,
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

  /deep/ thead {
    position: sticky;
    top: 0;
    z-index: 3;
    box-shadow: 0 4px 4px -4px rgba(0, 0, 0, 0.8);
  }

</style>
