<template>

  <FacilityAppBarPage>
    <template #default="{ pageContentHeight }">
      <!-- Adding 24 pixels to the max height to prevent having too much bottom padding space -->
      <KPageContainer
        class="flex-column"
        :style="{ maxHeight: pageContentHeight + 24 + 'px', padding: '3em 2em' }"
      >
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: $store.getters.facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'UserPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
        <div class="users-page-header">
          <h1>{{ coreString('usersLabel') }}</h1>
          <div class="users-page-header-actions">
            <KButton
              hasDropdown
              :primary="false"
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
              primary
              appearance="raised-button"
              :text="newUser$()"
              :to="$store.getters.facilityPageLinks.UserCreatePage"
            />
          </div>
        </div>
        <UsersTable
          ref="usersTableRef"
          :facilityUsers="facilityUsers"
          :usersCount="usersCount"
          :totalPages="totalPages"
          :dataLoading="dataLoading"
          :selectedUsers.sync="selectedUsers"
          :filterPageName="PageNames.FILTER_USERS_SIDE_PANEL"
          :numAppliedFilters="numAppliedFilters"
          @clearFilters="resetFilters"
          @change="onChange"
        >
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
              :ariaLabel="enrollToClass$()"
              :disabled="!canEnrollOrRemoveFromClass || !hasSelectedUsers"
              @click="navigateToSidePanel(PageNames.ENROLL_LEARNERS_SIDE_PANEL)"
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
              :ariaLabel="deleteSelectionTooltip"
              :disabled="!canDeleteSelection || !hasSelectedUsers"
              @click="isMoveToTrashModalOpen = true"
            />
            <KTooltip
              reference="trashButton"
              :refs="$refs"
              :text="deleteSelectionTooltip"
            />
          </template>
        </UsersTable>
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

  import { ref, getCurrentInstance, onMounted } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import useUser from 'kolibri/composables/useUser';
  import { UserKinds } from 'kolibri/constants';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import useUserManagement from '../../../composables/useUserManagement';
  import FacilityAppBarPage from '../../FacilityAppBarPage';
  import { PageNames } from '../../../constants';
  import UsersTable from '../common/UsersTable.vue';
  import { overrideRoute } from '../../../utils';
  import MoveToTrashModal from '../common/MoveToTrashModal.vue';

  export default {
    name: 'UsersRootPage',
    metaInfo() {
      return {
        title: this.coreString('usersLabel'),
      };
    },
    components: {
      UsersTable,
      MoveToTrashModal,
      FacilityAppBarPage,
    },
    mixins: [commonCoreStrings],
    setup() {
      usePreviousRoute();
      const route = useRoute();
      const router = useRouter();
      const { currentUserId, isSuperuser, isAdmin } = useUser();
      const { userIsMultiFacilityAdmin } = useFacilities();
      const isMoveToTrashModalOpen = ref(false);
      const usersTableRef = ref(null);

      const {
        newUser$,
        viewTrash$,
        assignCoach$,
        viewNewUsers$,
        enrollToClass$,
        removeFromClass$,
        deleteSelection$,
        cannotDeleteSelfTooltip$,
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

      return {
        PageNames,
        userIsMultiFacilityAdmin,
        facilityUsers,
        totalPages,
        usersCount,
        dataLoading,
        classes,
        usersTableRef,
        numAppliedFilters,
        isMoveToTrashModalOpen,
        onChange,
        onModalBlur,
        resetFilters,
        clearSelectedUsers,
        newUser$,
        viewTrash$,
        assignCoach$,
        viewNewUsers$,
        enrollToClass$,
        removeFromClass$,
        deleteSelection$,
        cannotDeleteSelfTooltip$,
        selectedUsers,
        currentUserId,
        isSuperuser,
        isAdmin,
        navigateToSidePanel,
      };
    },
    computed: {
      pageDropdownOptions() {
        return [
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
      },
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
      deleteSelectionTooltip() {
        if (this.listContainsLoggedInUser) {
          return this.cannotDeleteSelfTooltip$();
        }
        return this.deleteSelection$();
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

  .users-page-header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2em;

    h1 {
      margin: 0;
    }

    .users-page-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: flex-end;
    }
  }

  .flex-column {
    display: flex;
    flex-direction: column;
  }

</style>
