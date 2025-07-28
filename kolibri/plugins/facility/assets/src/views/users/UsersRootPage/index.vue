<template>

  <FacilityAppBarPage>
    <KPageContainer>
      <p>
        <KRouterLink
          v-if="userIsMultiFacilityAdmin"
          :to="{
            name: $store.getters.facilityPageLinks.AllFacilitiesPage.name,
            params: { subtopicName: 'UserPage' },
          }"
          icon="back"
          :text="coreString('changeLearningFacility')"
        />
      </p>
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
        :facilityUsers="facilityUsers"
        :usersCount="usersCount"
        :totalPages="totalPages"
        :dataLoading="dataLoading"
        :selectedUsers.sync="selectedUsers"
        :filterPageName="PageNames.FILTER_USERS_SIDE_PANEL"
      >
        <template #userActions>
          <router-link :to="overrideRoute($route, { name: PageNames.ASSIGN_COACHES_SIDE_PANEL })">
            <KIconButton
              icon="assignCoaches"
              :ariaLabel="assignCoach$()"
              :tooltip="assignCoach$()"
            />
          </router-link>
          <router-link :to="overrideRoute($route, { name: PageNames.ENROLL_LEARNERS_SIDE_PANEL })">
            <KIconButton
              icon="add"
              :ariaLabel="enrollToClass$()"
              :tooltip="enrollToClass$()"
            />
          </router-link>
          <router-link
            :to="overrideRoute($route, { name: PageNames.REMOVE_FROM_CLASSES_SIDE_PANEL })"
          >
            <KIconButton
              icon="remove"
              :ariaLabel="removeFromClass$()"
              :tooltip="removeFromClass$()"
            />
          </router-link>
          <router-link
            :to="overrideRoute($route, { name: PageNames.MOVE_TO_TRASH_TRASH_SIDE_PANEL })"
          >
            <KIconButton
              icon="trash"
              :ariaLabel="deleteSelection$()"
              :tooltip="deleteSelection$()"
            />
          </router-link>
        </template>
      </UsersTable>
      <!-- For sidepanels -->
      <router-view
        :selectedUsers="selectedUsers"
        :classes="classes"
      />
    </KPageContainer>
  </FacilityAppBarPage>

</template>


<script>

  import { ref, getCurrentInstance, onMounted } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import useUserManagement from '../../../composables/useUserManagement';
  import FacilityAppBarPage from '../../FacilityAppBarPage';
  import { PageNames } from '../../../constants';
  import UsersTable from '../common/UsersTable.vue';
  import { overrideRoute } from '../../../utils';

  export default {
    name: 'UserPage',
    metaInfo() {
      return {
        title: this.coreString('usersLabel'),
      };
    },
    components: {
      UsersTable,
      FacilityAppBarPage,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { userIsMultiFacilityAdmin } = useFacilities();
      const selectedUsers = ref(new Set());

      const {
        newUser$,
        viewTrash$,
        assignCoach$,
        viewNewUsers$,
        enrollToClass$,
        removeFromClass$,
        deleteSelection$,
      } = bulkUserManagementStrings;

      const { $store, $router } = getCurrentInstance().proxy;
      const activeFacilityId =
        $router.currentRoute.params.facility_id || $store.getters.activeFacilityId;
      const { facilityUsers, totalPages, usersCount, dataLoading, classes, fetchClasses } =
        useUserManagement({ activeFacilityId });

      onMounted(() => {
        fetchClasses();
      });

      return {
        PageNames,
        userIsMultiFacilityAdmin,
        facilityUsers,
        totalPages,
        usersCount,
        dataLoading,
        classes,
        newUser$,
        viewTrash$,
        assignCoach$,
        viewNewUsers$,
        enrollToClass$,
        removeFromClass$,
        deleteSelection$,
        selectedUsers,
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
          },
        ];
      },
    },
    methods: {
      overrideRoute,
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
    margin-bottom: 16px;

    h1 {
      margin: 16px 0;
    }

    .users-page-header-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: flex-end;
    }
  }

</style>
