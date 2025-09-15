<template>

  <ImmersivePage
    :appBarTitle="removedUsersTitle$()"
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
        <div class="removed-users-page-header">
          <h1>{{ removedUsersTitle$() }}</h1>
          <p v-if="showUsersTable">
            {{ removedUsersPageDescription$() }}
          </p>
        </div>
        <UsersTable
          v-if="showUsersTable"
          :facilityUsers="facilityUsers"
          :usersCount="usersCount"
          :totalPages="totalPages"
          :dataLoading="dataLoading"
          :selectedUsers.sync="selectedUsers"
          :filterPageName="PageNames.FILTER_USERS_SIDE_PANEL__TRASH"
          :numAppliedFilters="numAppliedFilters"
          @clearFilters="resetFilters"
          @change="onChange"
        >
          <template #userActions>
            <KIconButton
              icon="refresh"
              :disabled="!selectedUsers.size || loading"
              :tooltip="selectedUsers.size > 1 ? recoverSelectionLabel$() : recoverLabel$()"
              @click="recoverUsers(selectedUsers)"
            />
            <KIconButton
              icon="trash"
              :disabled="!selectedUsers.size || loading"
              :ariaLabel="deletePermanentlyLabel$()"
              :tooltip="deletePermanentlyLabel$()"
              @click="usersToDelete = selectedUsers"
            />
          </template>
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
      <router-view
        :backRoute="overrideRoute($route, { name: PageNames.USERS_TRASH_PAGE })"
        :classes="classes"
        :selectedUsers="selectedUsers"
        @change="onChange"
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

  import store from 'kolibri/store';
  import { computed, onMounted, ref } from 'vue';
  import { useRoute } from 'vue-router/composables';

  import useSnackbar from 'kolibri/composables/useSnackbar';
  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import usePreviousRoute from 'kolibri-common/composables/usePreviousRoute';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import DeletedFacilityUserResource from 'kolibri-common/apiResources/DeletedFacilityUserResource';

  import useUserManagement from '../../../composables/useUserManagement';
  import { PageNames } from '../../../constants';
  import { overrideRoute } from '../../../utils';
  import UsersTable from '../common/UsersTable.vue';
  import emptyTrashCloudSvg from '../../../images/empty_trash_cloud.svg';
  import PermanentDeleteModal from './PermanentDeleteModal.vue';

  export default {
    name: 'UsersTrashPage',
    components: {
      UsersTable,
      ImmersivePage,
      PermanentDeleteModal,
    },
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
      } = bulkUserManagementStrings;

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

      return {
        // ref and computed properties
        loading,
        classes,
        PageNames,
        totalPages,
        usersCount,
        dataLoading,
        facilityUsers,
        usersToDelete,
        selectedUsers,
        showUsersTable,
        emptyTrashCloudSvg,
        numAppliedFilters,
        userDropdownMenuOptions,

        // Methods
        onChange,
        recoverUsers,
        overrideRoute,
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
      };
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

  .removed-users-page-header {
    margin-bottom: 16px;
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

</style>
