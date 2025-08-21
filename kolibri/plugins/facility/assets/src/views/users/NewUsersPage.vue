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
          @change="onUsersChange"
        >
          <template #userActions>
            <component
              :is="canAssignCoaches ? 'router-link' : 'span'"
              :to="
                overrideRoute($route, {
                  name: PageNames.ASSIGN_COACHES_SIDE_PANEL__NEW_USERS,
                })
              "
              :class="{ 'disabled-link': !canAssignCoaches }"
            >
              <KIconButton
                icon="assignCoaches"
                :ariaLabel="assignCoach$()"
                :tooltip="assignCoach$()"
                :disabled="!canAssignCoaches"
              />
            </component>
            <component
              :is="canEnrollOrRemoveFromClass ? 'router-link' : 'span'"
              :to="
                overrideRoute($route, {
                  name: PageNames.ENROLL_LEARNERS_SIDE_PANEL__NEW_USERS,
                })
              "
              :class="{ 'disabled-link': !canEnrollOrRemoveFromClass }"
            >
              <KIconButton
                icon="add"
                :ariaLabel="enrollToClass$()"
                :tooltip="enrollToClass$()"
                :disabled="!canEnrollOrRemoveFromClass"
              />
            </component>
            <component
              :is="canEnrollOrRemoveFromClass ? 'router-link' : 'span'"
              :to="
                overrideRoute($route, {
                  name: PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL__NEW_USERS,
                })
              "
              :class="{ 'disabled-link': !canEnrollOrRemoveFromClass }"
            >
              <KIconButton
                icon="remove"
                :ariaLabel="removeFromClass$()"
                :tooltip="removeFromClass$()"
                :disabled="!canEnrollOrRemoveFromClass"
              />
            </component>
            <KIconButton
              icon="trash"
              :ariaLabel="deleteSelection$()"
              :tooltip="deleteSelection$()"
              :disabled="!hasSelectedUsers || listContainsLoggedInUser"
              @click="isMoveToTrashModalOpen = true"
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
        :onUsersChange="onUsersChange"
        @hook:beforeDestroy="selectedUsers = new Set()"
      />

      <!-- Modals -->
      <MoveToTrashModal
        v-if="isMoveToTrashModalOpen"
        :selectedUsers="selectedUsers"
        :onBlur="onModalBlur"
        :onUsersChange="onUsersChange"
        @close="isMoveToTrashModalOpen = false"
      />
    </template>
  </ImmersivePage>

</template>


<script>

  import store from 'kolibri/store';
  import { computed, onMounted, ref } from 'vue';
  import { useRoute } from 'vue-router/composables';
  import useUser from 'kolibri/composables/useUser';
  import { UserKinds } from 'kolibri/constants';

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  import { UserKinds } from 'kolibri/constants';
  import useUser from 'kolibri/composables/useUser';
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
      const usersTableRef = ref(null);
      const isMoveToTrashModalOpen = ref(false);

      const activeFacilityId = route.params.facility_id || store.getters.activeFacilityId;

      const newUsersCreationTreshold = new Date();
      newUsersCreationTreshold.setDate(newUsersCreationTreshold.getDate() - MAX_NEW_USER_DAYS);

      const {
        facilityUsers,
        search,
        classes,
        totalPages,
        usersCount,
        dataLoading,
        numAppliedFilters,
        fetchUsers,
        fetchClasses,
        resetFilters,
      } = useUserManagement({
        activeFacilityId,
        dateJoinedGt: newUsersCreationTreshold,
      });

      const selectedUsers = ref(new Set());
      const { currentUserId } = useUser();

      const showUsersTable = computed(
        () =>
          facilityUsers.value.length > 0 ||
          search.value?.length > 0 ||
          numAppliedFilters.value > 0 ||
          dataLoading.value,
      );

      function onUsersChange({ resetSelection = false } = {}) {
        fetchUsers();
        if (resetSelection) {
          selectedUsers.value.clear();
        }
      }

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
        onModalBlur,
        onUsersChange,
        overrideRoute,
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
