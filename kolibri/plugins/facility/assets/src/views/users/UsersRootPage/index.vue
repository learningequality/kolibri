<template>

  <FacilityAppBarPage
    class="wrapper"
    :appearanceOverrides="{
      width: '100%',
      height: '100%',
      padding: '0 1em',
    }"
  >
    <template #default="{ pageContentHeight }">
      <!--
      There's some wonky looking math here for styles that basically:
      Center the content & pad it appropriately against the screen & appbar.
      This works specifically for the AppBarPage ancestry and sets the content
      container at ~0.5em padding on small screens and 1em otherwise
      -->
      <KPageContainer :style="getPageContainerStyles(pageContentHeight)">
        <div
          :style="{
            marginTop: windowIsSmall ? '8px' : '16px',
            backgroundColor: $themeTokens.surface,
          }"
        >
          <KRouterLink
            v-if="userIsMultiFacilityAdmin"
            :to="{
              name: $store.getters.facilityPageLinks.AllFacilitiesPage.name,
              params: { subtopicName: 'UserPage' },
            }"
            style="margin: 1em 0 0.25em"
            icon="back"
            :text="coreString('changeLearningFacility')"
          />

          <UsersTableToolbar
            :title="coreString('usersLabel')"
            :hasSelectedUsers="hasSelectedUsers"
          >
            <template #headerActions>
              <div class="header-actions">
                <KButton
                  hasDropdown
                  :text="coreString('optionsLabel')"
                >
                  <template #menu>
                    <KDropdownMenu
                      :options="pageDropdownOptions"
                      @select="handlePageDropdownSelection"
                    />
                  </template>
                </KButton>
                <KRouterLink
                  v-if="!windowIsSmall"
                  primary
                  appearance="raised-button"
                  :text="newUser$()"
                  :to="$store.getters.facilityPageLinks.UserCreatePage"
                />
              </div>
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
                class="filter-button"
                :to="overrideRoute($route, { name: PageNames.FILTER_USERS_SIDE_PANEL })"
                :text="
                  numAppliedFilters ? numFilters$({ n: numAppliedFilters }) : coreString('filter')
                "
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
                style="display: inline-block"
                @click="clearSelectedUsers"
              />
            </template>
            <template #userActions>
              <KIconButton
                ref="assignButton"
                icon="assignCoaches"
                :ariaLabel="assignCoach$()"
                :disabled="!canAssignCoaches || !hasSelectedUsers"
                @click="navigateToSidePanel(PageNames.ASSIGN_COACHES_SIDE_PANEL)"
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
                @click="navigateToSidePanel(PageNames.ENROLL_LEARNERS_SIDE_PANEL)"
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
                @click="navigateToSidePanel(PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL)"
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
          class="users-table"
          :style="usersTableStyles"
          :facilityUsers="facilityUsers"
          :dataLoading="dataLoading"
          :selectedUsers.sync="selectedUsers"
          :numAppliedFilters="numAppliedFilters"
          @clearSelectedUsers="clearSelectedUsers"
          @change="onChange"
        />
        <!-- For sidepanels -->
        <router-view
          :selectedUsers="selectedUsers"
          :classes="classes"
          :onBlur="onModalBlur"
          :onChange="onChange"
          @clearSelection="clearSelectedUsers"
        />

        <!-- Modals -->
        <MoveToTrashModal
          v-if="isMoveToTrashModalOpen"
          :selectedUsers="selectedUsers"
          :onBlur="onModalBlur"
          :onChange="onChange"
          @close="isMoveToTrashModalOpen = false"
        />
      </KPageContainer>
    </template>
  </FacilityAppBarPage>

</template>


<script>

  import FilterTextbox from 'kolibri/components/FilterTextbox';
  import PaginationActions from 'kolibri-common/components/PaginationActions';
  import { ref, computed, getCurrentInstance, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKResponsiveWindow from 'kolibri-design-system/lib/composables/useKResponsiveWindow';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import useUser from 'kolibri/composables/useUser';
  import { UserKinds } from 'kolibri/constants';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import UsersTableToolbar from '../common/UsersTableToolbar/index.vue';
  import useUserManagement from '../../../composables/useUserManagement';
  import FacilityAppBarPage from '../../FacilityAppBarPage';
  import { PageNames } from '../../../constants';
  import UsersTable from '../common/UsersTable.vue';
  import { overrideRoute } from '../../../utils';
  import MoveToTrashModal from '../common/MoveToTrashModal.vue';
  import useUsersTableSearch from '../../../composables/useUsersTableSearch';
  import usePagination from '../../../composables/usePagination';

  export default {
    name: 'UsersRootPage',
    metaInfo() {
      return {
        title: this.coreString('usersLabel'),
      };
    },
    components: {
      UsersTable,
      UsersTableToolbar,
      MoveToTrashModal,
      FacilityAppBarPage,
      FilterTextbox,
      PaginationActions,
    },
    mixins: [commonCoreStrings],
    setup() {
      usePreviousRoute();
      const route = useRoute();
      const router = useRouter();
      const { currentUserId, isSuperuser, isAdmin, isAppContext } = useUser();
      const { userIsMultiFacilityAdmin } = useFacilities();
      const isMoveToTrashModalOpen = ref(false);

      const {
        newUser$,
        viewTrash$,
        assignCoach$,
        viewNewUsers$,
        enrollInClass$,
        removeFromClass$,
        deleteSelection$,
        numFilters$,
        numUsersSelected$,
        clearFiltersLabel$,
      } = bulkUserManagementStrings;

      const { $store, $router } = getCurrentInstance().proxy;
      const activeFacilityId =
        $router.currentRoute.params.facility_id || $store.getters.activeFacilityId;
      const {
        selectedUsers,
        facilityUsers,
        totalPages,
        usersCount,
        dataLoading,
        classes,
        numAppliedFilters,
        onChange,
        fetchClasses,
        resetFilters,
      } = useUserManagement({ activeFacilityId });

      // Use our new composables
      const { searchTerm, filterTextboxRef } = useUsersTableSearch();
      const { currentPage, itemsPerPage } = usePagination({ usersCount, totalPages });
      const { windowIsSmall, windowIsShort } = useKResponsiveWindow();

      onMounted(() => {
        fetchClasses();
      });

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

      const shouldCropUsersTable = computed(() => !windowIsShort?.value);

      function getPageContainerMaxHeight(pageContentHeight) {
        if (!shouldCropUsersTable.value) {
          return 'None';
        }
        const maxHeight = pageContentHeight - 24;
        return maxHeight + 'px';
      }

      const marginTop = computed(() => {
        // TODO: This should refer to the actual appbar height
        if (windowIsSmall.value) {
          if (isAppContext.value) {
            return 72;
          }
          return 112;
        }
        return 80;
      });

      function getPageContainerStyles(pageContentHeight) {
        // If table is not cropped, add some bottom margin to prevent the table from
        // touching the bottom edge
        const marginBottom = shouldCropUsersTable.value ? 0 : 16;

        return {
          display: 'flex',
          flexDirection: 'column',
          maxWidth: '1440px',
          margin: `${marginTop.value}px auto ${marginBottom}px`,
          maxHeight: getPageContainerMaxHeight(pageContentHeight),
        };
      }

      const hasSelectedUsers = computed(() => {
        return selectedUsers.value && selectedUsers.value.size > 0;
      });

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

      return {
        windowIsSmall,
        usersTableStyles,
        // Route utilities
        overrideRoute,
        PageNames,

        // User and facility info
        userIsMultiFacilityAdmin,
        currentUserId,
        isSuperuser,
        isAdmin,

        // Table data
        facilityUsers,
        totalPages,
        usersCount,
        dataLoading,
        classes,
        selectedUsers,
        numAppliedFilters,
        hasSelectedUsers,

        // Search functionality from composable
        searchTerm,
        filterTextboxRef,

        // Pagination from composable
        currentPage,
        itemsPerPage,

        // Modal state
        isMoveToTrashModalOpen,

        // Methods
        onChange,
        onModalBlur,
        clearSelectedUsers,
        navigateToSidePanel,
        resetFilters,
        getPageContainerStyles,

        // Strings
        newUser$,
        viewTrash$,
        assignCoach$,
        viewNewUsers$,
        enrollInClass$,
        removeFromClass$,
        deleteSelection$,
        numFilters$,
        numUsersSelected$,
        clearFiltersLabel$,
      };
    },
    computed: {
      pageDropdownOptions() {
        const opts = [
          {
            label: this.viewNewUsers$(),
            id: 'view_new_users',
            value: PageNames.NEW_USERS_PAGE,
          },
          {
            label: this.viewTrash$(),
            id: 'view_trash',
            value: PageNames.USERS_TRASH_PAGE,
          },
        ];
        if (this.windowIsSmall) {
          opts.unshift({
            label: this.newUser$(),
            id: 'new_user',
            value: PageNames.ADD_NEW_USER_SIDE_PANEL__NEW_USERS,
          });
        }
        return opts;
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
    methods: {
      handlePageDropdownSelection(option) {
        if (option.value) {
          this.$router.push({
            name: option.value,
            params: { facility_id: this.$store.getters.activeFacilityId },
          });
        }
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

  .header-actions {
    display: flex;
    gap: 16px;
    align-items: center;
    margin-left: auto;
  }

</style>
