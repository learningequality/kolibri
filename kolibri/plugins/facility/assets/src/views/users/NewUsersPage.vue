<template>

  <ImmersivePage
    :appBarTitle="newUsers$()"
    :route="$store.getters.facilityPageLinks.UserPage"
  >
    <KPageContainer style="max-width: 1000px; margin: 24px auto">
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
        v-if="facilityUsers.length"
        :facilityUsers="facilityUsers"
        :usersCount="usersCount"
        :totalPages="totalPages"
        :dataLoading="dataLoading"
        :selectedUsers.sync="selectedUsers"
        :filterPageName="PageNames.FILTER_USERS_SIDE_PANEL__NEW_USERS"
        @change="onUsersChange"
      >
        <template #userActions>
          <router-link
            :to="overrideRoute($route, { name: PageNames.ASSIGN_COACHES_SIDE_PANEL__NEW_USERS })"
          >
            <KIconButton
              icon="assignCoaches"
              :ariaLabel="assignCoach$()"
              :tooltip="assignCoach$()"
            />
          </router-link>
          <router-link
            :to="overrideRoute($route, { name: PageNames.ENROLL_LEARNERS_SIDE_PANEL__NEW_USERS })"
          >
            <KIconButton
              icon="add"
              :ariaLabel="enrollToClass$()"
              :tooltip="enrollToClass$()"
            />
          </router-link>
          <router-link
            :to="
              overrideRoute($route, { name: PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL__NEW_USERS })
            "
          >
            <KIconButton
              icon="remove"
              :ariaLabel="removeFromClass$()"
              :tooltip="removeFromClass$()"
            />
          </router-link>
          <router-link
            :to="
              overrideRoute($route, { name: PageNames.MOVE_TO_TRASH_TRASH_SIDE_PANEL__NEW_USERS })
            "
          >
            <KIconButton
              icon="trash"
              :ariaLabel="deleteSelection$()"
              :tooltip="deleteSelection$()"
            />
          </router-link>
        </template>
      </UsersTable>
      <div
        v-else
        class="empty-new-users"
      >
        <div class="empty-new-users-content">
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
    <router-view
      :backRoute="overrideRoute($route, { name: PageNames.NEW_USERS_PAGE })"
      :classes="classes"
      :selectedUsers="selectedUsers"
      @change="onUsersChange"
    />
  </ImmersivePage>

</template>


<script>

  import store from 'kolibri/store';
  import { onMounted, ref } from 'vue';
  import { useRoute } from 'vue-router/composables';

  import ImmersivePage from 'kolibri/components/pages/ImmersivePage';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';

  import useUserManagement from '../../composables/useUserManagement';
  import { PageNames } from '../../constants';
  import { overrideRoute } from '../../utils';
  import UsersTable from './common/UsersTable.vue';

  // Constant for the maximum number of days to consider a user as a "new user"
  const MAX_NEW_USER_DAYS = 30;

  export default {
    name: 'NewUsersPage',
    components: {
      UsersTable,
      ImmersivePage,
    },
    setup() {
      const route = useRoute();

      const activeFacilityId = route.params.facility_id || store.getters.activeFacilityId;

      const newUsersCreationTreshold = new Date();
      newUsersCreationTreshold.setDate(newUsersCreationTreshold.getDate() - MAX_NEW_USER_DAYS);

      const {
        facilityUsers,
        classes,
        totalPages,
        usersCount,
        dataLoading,
        fetchUsers,
        fetchClasses,
      } = useUserManagement({
        activeFacilityId,
        dateJoinedGt: newUsersCreationTreshold,
      });

      const selectedUsers = ref(new Set());

      function onUsersChange() {
        fetchUsers();
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
        selectedUsers,
        onUsersChange,
        overrideRoute,
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
      };
    },
  };

</script>


<style lang="scss" scoped>

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
      margin-bottom: 16px;

      strong {
        font-size: 16px;
      }

      p {
        margin: 8px 0;
        font-size: 14px;
      }
    }
  }

</style>
