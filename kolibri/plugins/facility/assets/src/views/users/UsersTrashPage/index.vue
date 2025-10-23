<template>

  <ImmersivePage
    :appBarTitle="removedUsersTitle$()"
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
      <KPageContainer
        :style="{
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1440px',
          margin: (windowIsSmall ? 64 : 80) + 'px auto 0',
          maxHeight: pageContentHeight - (windowIsSmall ? 70 : 96) + 'px',
          backgroundColor: $themeTokens.surface,
        }"
      >
        <div
          :style="{
            padding: '1em 1em 0 1em',
            backgroundColor: $themeTokens.surface,
          }"
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
                <h1>{{ removedUsersTitle$() }}</h1>
                <FilterTextbox
                  v-if="facilityUsers.length || searchTerm || numAppliedFilters > 0"
                  ref="filterTextboxRef"
                  v-model="searchTerm"
                  class="search-box"
                  :placeholder="coreString('searchForUser')"
                  :aria-label="coreString('searchForUser')"
                />
                <KRouterLink
                  v-if="facilityUsers.length || searchTerm || numAppliedFilters > 0"
                  appearance="basic-link"
                  :text="numAppliedFilters ? numFilters$({ n: numAppliedFilters }) : filterLabel$()"
                  class="filter-button"
                  :to="overrideRoute($route, { name: PageNames.FILTER_USERS_SIDE_PANEL__TRASH })"
                />
                <KButton
                  v-if="numAppliedFilters > 0"
                  appearance="basic-link"
                  :appearanceOverrides="{ color: $themeTokens.error }"
                  :text="clearFiltersLabel$()"
                  @click="resetFilters"
                />
                <p
                  v-if="showUsersTable"
                  class="page-description"
                >
                  {{ removedUsersPageDescription$() }}
                </p>
              </div>
            </template>
            <template #bottomRow>
              <div class="bottom-row-left">
                <KIconButton
                  ref="recoverButton"
                  icon="refresh"
                  :disabled="!hasSelectedUsers || loading"
                  :ariaLabel="selectedUsers.size > 1 ? recoverSelectionLabel$() : recoverLabel$()"
                  @click="recoverUsers(selectedUsers)"
                />
                <KTooltip
                  reference="recoverButton"
                  :refs="$refs"
                  :text="selectedUsers.size > 1 ? recoverSelectionLabel$() : recoverLabel$()"
                />
                <KIconButton
                  ref="deleteButton"
                  icon="trash"
                  :disabled="!hasSelectedUsers || loading"
                  :ariaLabel="deletePermanentlyLabel$()"
                  @click="usersToDelete = selectedUsers"
                />
                <KTooltip
                  reference="deleteButton"
                  :refs="$refs"
                  :text="deletePermanentlyLabel$()"
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
          :numAppliedFilters="numAppliedFilters"
          @clearSelectedUsers="clearSelectedUsers"
          @change="onChange"
        >
          <template #userDropdownMenu="{ user }">
            <KDropdownMenu
              :options="userDropdownMenuOptions"
              @select="handleDropdownSelect($event, user)"
            />
          </template>
        </UsersTable>
        <div
          v-else
          class="empty-removed-users"
        >
          <div class="empty-removed-users-content">
            <KImg
              isDecorative
              :src="emptyTrashCloudSvg"
              backgroundColor="transparent"
            />
            <strong> {{ noRemovedUsersLabel$() }}</strong>
            <p
              :style="{
                color: $themePalette.grey.v_700,
              }"
            >
              {{ removedUsersNotice$() }}
            </p>
          </div>
        </div>
      </KPageContainer>
      <!-- For sidepanels -->
      <router-view
        :selectedUsers="selectedUsers"
        :classes="classes"
        :onBlur="onModalBlur"
        :onChange="onChange"
        @clearSelection="clearSelectedUsers"
      />
      <PermanentDeleteModal
        v-if="usersToDelete"
        :selectedUsers="usersToDelete"
        @close="usersToDelete = null"
        @change="onChange"
      />
    </template>
  </ImmersivePage>

</template>


<script>

  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import PaginationActions from 'kolibri-common/components/PaginationActions';
  import store from 'kolibri/store';
  import { computed, onMounted, ref } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';

  import useSnackbar from 'kolibri/composables/useSnackbar';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import DeletedFacilityUserResource from 'kolibri-common/apiResources/DeletedFacilityUserResource';

  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useUserManagement from '../../../composables/useUserManagement';
  import { PageNames } from '../../../constants';
  import { overrideRoute } from '../../../utils';
  import UsersTable from '../common/UsersTable.vue';
  import UsersTableToolbar from '../common/UsersTableToolbar';
  import emptyTrashCloudSvg from '../../../images/empty_trash_cloud.svg';
  import useUsersTableSearch from '../../../composables/useUsersTableSearch';
  import usePagination from '../../../composables/usePagination';
  import PermanentDeleteModal from './PermanentDeleteModal.vue';

  export default {
    name: 'UsersTrashPage',
    components: {
      UsersTable,
      UsersTableToolbar,
      ImmersivePage,
      PermanentDeleteModal,
      FilterTextbox,
      PaginationActions,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { createSnackbar } = useSnackbar();
      usePreviousRoute();
      const route = useRoute();
      const usersToDelete = ref(null);
      const loading = ref(false);

      const activeFacilityId = route.params.facility_id || store.getters.activeFacilityId;

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
        softDeletedUsers: true,
      });

      const showUsersTable = computed(
        () =>
          facilityUsers.value.length > 0 ||
          search.value?.length > 0 ||
          numAppliedFilters.value > 0 ||
          dataLoading.value,
      );

      const hasSelectedUsers = computed(() => {
        return selectedUsers.value && selectedUsers.value.size > 0;
      });

      // Use our new composables
      const { searchTerm, filterTextboxRef } = useUsersTableSearch();
      const { currentPage, itemsPerPage } = usePagination({ usersCount, totalPages });

      const {
        backToUsers$,
        recoverLabel$,
        removedUsersTitle$,
        removedUsersNotice$,
        noRemovedUsersLabel$,
        usersRecoveredNotice$,
        recoverSelectionLabel$,
        deletePermanentlyLabel$,
        removedUsersPageDescription$,
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

      const recoverUsers = async users => {
        try {
          loading.value = true;
          await DeletedFacilityUserResource.restoreCollection({
            by_ids: Array.from(users).join(','),
          });
          createSnackbar(usersRecoveredNotice$({ num: users.size }));
          onChange({ resetSelection: true });
          loading.value = false;
        } catch (error) {
          loading.value = false;
        }
      };

      const UserActions = {
        RESTORE: 'RESTORE',
        PERMANENT_DELETE: 'PERMANENT_DELETE',
      };

      const userDropdownMenuOptions = [
        {
          label: recoverLabel$(),
          value: UserActions.RESTORE,
        },
        {
          label: deletePermanentlyLabel$(),
          value: UserActions.PERMANENT_DELETE,
        },
      ];

      const handleDropdownSelect = (action, user) => {
        const userSet = new Set([user.id]);
        if (action.value === UserActions.RESTORE) {
          recoverUsers(userSet);
        } else if (action.value === UserActions.PERMANENT_DELETE) {
          usersToDelete.value = userSet;
        }
      };

      onMounted(() => {
        fetchClasses();
      });

      const { windowIsSmall } = useKResponsiveWindow();

      return {
        windowIsSmall,

        // Route utilities
        overrideRoute,
        PageNames,

        // ref and computed properties
        loading,
        classes,
        totalPages,
        usersCount,
        dataLoading,
        facilityUsers,
        usersToDelete,
        selectedUsers,
        showUsersTable,
        hasSelectedUsers,
        emptyTrashCloudSvg,
        numAppliedFilters,
        userDropdownMenuOptions,

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
        recoverUsers,
        resetFilters,
        handleDropdownSelect,

        // Strings
        backToUsers$,
        recoverLabel$,
        recoverSelectionLabel$,
        deletePermanentlyLabel$,
        removedUsersTitle$,
        removedUsersNotice$,
        noRemovedUsersLabel$,
        removedUsersPageDescription$,
        numFilters$,
        filterLabel$,
        numUsersSelected$,
        clearFiltersLabel$,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .top-row-left {
    display: flex;
    flex: 1;
    flex-wrap: wrap;
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

  .page-description {
    flex-grow: 1;
    margin: 0 !important;
    text-align: center;
  }

  .empty-removed-users {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    padding: 24px;
    text-align: center;

    .empty-removed-users-content {
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

  /deep/ thead {
    position: sticky;
    top: 0;
    z-index: 4;
    box-shadow: 0 4px 4px -4px rgba(0, 0, 0, 0.8);
  }

</style>
