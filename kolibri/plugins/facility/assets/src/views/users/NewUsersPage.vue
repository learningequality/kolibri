<template>

  <ImmersivePage
    :appBarTitle="newUsers$()"
    :route="$store.getters.facilityPageLinks.UserPage"
  >
    <template #default="{ pageContentHeight }">
      <KPageContainer
        class="page-container"
        :style="{ maxHeight: pageContentHeight + 24 + 'px' }"
      >
        <p>
          <KRouterLink
            :to="$store.getters.facilityPageLinks.UserPage"
            icon="back"
            :text="backToUsers$()"
          />
        </p>
        <div class="new-users-page-header">
          <h1>{{ newUsers$() }}</h1>
          <div>
            <KRouterLink
              primary
              appearance="raised-button"
              :text="newUser$()"
              :to="$store.getters.facilityPageLinks.UserCreatePage"
            />
          </div>
        </div>
        <UsersTable
          v-if="showUsersTable"
          ref="usersTableRef"
          :facilityUsers="facilityUsers"
          :usersCount="usersCount"
          :totalPages="totalPages"
          :dataLoading="dataLoading"
          :selectedUsers.sync="selectedUsers"
          :filterPageName="PageNames.FILTER_USERS_SIDE_PANEL__NEW_USERS"
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
          </template>
        </UsersTable>
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
      </KPageContainer>
      <!-- For sidepanels -->
      <router-view
        :backRoute="overrideRoute($route, { name: PageNames.NEW_USERS_PAGE })"
        :classes="classes"
        :selectedUsers="selectedUsers"
        :onBlur="onModalBlur"
        :onChange="onChange"
        @hook:beforeDestroy="selectedUsers = new Set()"
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

  import store from 'kolibri/store';
  import { computed, onMounted, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import useUser from 'kolibri/composables/useUser';

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  import { UserKinds } from 'kolibri/constants';
  import useUserManagement from '../../composables/useUserManagement';
  import emptyPlusCloudSvg from '../../images/empty_plus_cloud.svg';
  import { PageNames } from '../../constants';
  import { overrideRoute } from '../../utils';
  import UsersTable from './common/UsersTable.vue';
  import MoveToTrashModal from './common/MoveToTrashModal.vue';

  // Constant for the maximum number of days to consider a user as a "new user"
  const MAX_NEW_USER_DAYS = 30;

  export default {
    name: 'NewUsersPage',
    components: {
      UsersTable,
      ImmersivePage,
      MoveToTrashModal,
    },
    setup() {
      usePreviousRoute();
      const route = useRoute();
      const router = useRouter();
      const { currentUserId, isSuperuser, isAdmin } = useUser();
      const usersTableRef = ref(null);
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
      } = bulkUserManagementStrings;

      function onModalBlur() {
        usersTableRef.value?.focus();
      }

      function navigateToSidePanel(sidePanelName) {
        const newRoute = overrideRoute(route, { name: sidePanelName });
        router.push(newRoute);
      }

      onMounted(() => {
        fetchClasses();
      });

      return {
        PageNames,
        classes,
        facilityUsers,
        totalPages,
        usersCount,
        dataLoading,
        usersTableRef,
        selectedUsers,
        showUsersTable,
        emptyPlusCloudSvg,
        numAppliedFilters,
        isMoveToTrashModalOpen,
        onChange,
        onModalBlur,
        overrideRoute,
        navigateToSidePanel,
        resetFilters,
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
          .every(
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

  .page-container {
    display: flex;
    flex-direction: column;
    max-width: 1000px;
    margin: 24px auto;
  }

  .new-users-page-header {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
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

</style>
