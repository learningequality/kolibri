<template>

  <DeviceAppBarPage :title="pageTitle">
    <KPageContainer class="device-container">
      <div class="description">
        <h1>
          {{ coreString('devicePermissionsLabel') }}
        </h1>
        <p>{{ $tr('devicePermissionsDescription') }}</p>
      </div>

      <PaginatedListContainer
        :dataLoading="loadingFacilityUsers"
        :items="usersFilteredByDropdown"
        :filterPlaceholder="$tr('searchPlaceholder')"
      >
        <template #otherFilter>
          <KSelect
            v-model="permissionsFilter"
            :label="$tr('permissionsLabel')"
            :options="permissionsOptions"
            :inline="true"
            class="type-filter"
          />
          <KSelect
            v-model="userTypeFilter"
            :label="coreString('userTypeLabel')"
            :options="userTypeOptions"
            :inline="true"
            class="type-filter"
          />
          <KSelect
            v-if="hasMultipleFacilities"
            v-model="facilityFilter"
            :label="coreString('facilityLabel')"
            :options="facilityOptions"
            :inline="true"
            class="type-filter"
          />
        </template>
        <template #default="{ items, filterInput }">
          <UserGrid
            :dataLoading="loadingFacilityUsers"
            :searchFilter="searchFilterText"
            :facilityUsers="items"
            :userPermissions="userPermissions"
            :filterText="filterInput"
          />
        </template>
      </PaginatedListContainer>
    </KPageContainer>
  </DeviceAppBarPage>

</template>


<script>

  import { mapState } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import PaginatedListContainer from 'kolibri-common/components/PaginatedListContainer';
  import { PermissionTypes, UserKinds } from 'kolibri/constants';
  import useFacilities from 'kolibri-common/composables/useFacilities';
  import DeviceAppBarPage from '../DeviceAppBarPage';
  import { deviceString } from '../commonDeviceStrings';
  import UserGrid from './UserGrid';

  const ALL_FILTER = 'all';

  export default {
    name: 'ManagePermissionsPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      DeviceAppBarPage,
      PaginatedListContainer,
      UserGrid,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { facilities } = useFacilities();
      return { facilities };
    },
    data() {
      return {
        searchFilterText: '',
        permissionsFilter: null,
        userTypeFilter: null,
        facilityFilter: null,
      };
    },
    computed: {
      ...mapState('managePermissions', {
        facilityUsers: state => state.facilityUsers,
        userPermissions: state => userid => state.permissions[userid],
        loadingFacilityUsers: state => state.loadingFacilityUsers,
      }),
      ...mapState({
        query: state => state.query,
      }),
      hasMultipleFacilities() {
        if (this.facilities) {
          return this.facilities.length > 1;
        } else {
          return false;
        }
      },
      facilityOptions() {
        // Generate the options for the dropdown from the list of
        // facilities on the device.
        const facilityChoices = this.facilities.map(f => {
          return { label: f.name, value: f.id };
        });

        return [{ label: this.$tr('allFacilityFilter'), value: ALL_FILTER }, ...facilityChoices];
      },
      pageTitle() {
        return deviceString('deviceManagementTitle');
      },
      userTypeOptions() {
        return [
          { label: this.$tr('allUserTypeFilter'), value: ALL_FILTER },
          { label: this.coreString('learnersLabel'), value: UserKinds.LEARNER },
          { label: this.coreString('coachesLabel'), value: UserKinds.COACH },
          { label: this.$tr('adminsLabel'), value: UserKinds.ADMIN },
          // No need to list super admin here because of permissionsFilter
        ];
      },
      permissionsOptions() {
        return [
          { label: this.$tr('allPermissionsFilterLabel'), value: ALL_FILTER },
          { label: this.$tr('canManageContentLabel'), value: PermissionTypes.LIMITED_PERMISSIONS },
          { label: this.coreString('superAdminLabel'), value: PermissionTypes.SUPERUSER },
          {
            label: this.$tr('noDevicePermissionsLabel'),
            value: PermissionTypes.NO_DEVICE_PERMISSIONS,
          },
        ];
      },
      usersFilteredByDropdown() {
        /*
         * We create 3 filter functions here which are conditionally passed to
         * Array.prototype.filter() functions called on all users which will result
         * in a set of users filtered per the options selected in the filters.
         */
        let users = this.facilityUsers;

        // Filter Functions
        const isInSelectedFacility = user => user.facility == this.facilityFilter.value;

        const isSelectedUserType = user => {
          // Learners don't have a `role` associated with them, so if the filter is asking
          // for learners, check that here.
          if (user.roles.length === 0) {
            return this.userTypeFilter.value === UserKinds.LEARNER;
          }
          if (this.userTypeFilter.value === UserKinds.COACH) {
            // Check for both kinds of coach roles
            return Boolean(
              user.roles.find(
                role => role.kind === UserKinds.COACH || role.kind === UserKinds.ASSIGNABLE_COACH,
              ),
            );
          }
          if (this.userTypeFilter.value === UserKinds.ADMIN) {
            // SUPERUSER and ADMIN are accounted for similarly here.

            return Boolean(
              user.roles.find(
                role => role.kind === UserKinds.SUPERUSER || role.kind === UserKinds.ADMIN,
              ),
            );
          }

          // Should never get here because all possible options are accounted for above.
          return false;
        };

        // Last filter function for the permissions
        const isSelectedPermissions = user => {
          const userPermissions = this.userPermissions(user.id);
          switch (this.permissionsFilter.value) {
            case PermissionTypes.LIMITED_PERMISSIONS:
              return Boolean(userPermissions) && userPermissions.can_manage_content;
            case PermissionTypes.SUPERUSER:
              // Accounts for explicitly SUPERUSER types
              return Boolean(userPermissions) && userPermissions.is_superuser;
            case PermissionTypes.NO_DEVICE_PERMISSIONS:
              return (
                !userPermissions ||
                (!userPermissions.is_superuser && !userPermissions.can_manage_content)
              );
            default:
              // Should never get here because the only other option is ALL_FILTER
              // and this function won't be run if that's the case.
              return false;
          }
        };

        // Applying the filters. Only applied if ALL_FILTER isn't selected.
        // Only filter by facility if the device has multiple facilities.
        if (this.hasMultipleFacilities) {
          users =
            this.facilityFilter.value === ALL_FILTER ? users : users.filter(isInSelectedFacility);
        }

        users = this.userTypeFilter.value === ALL_FILTER ? users : users.filter(isSelectedUserType);

        users =
          this.permissionsFilter.value === ALL_FILTER ? users : users.filter(isSelectedPermissions);

        return users;
      },
    },
    watch: {
      // These watchers update the query when the dropdown
      // selections are changed. This lets us persist the values across
      // routes within Device.
      permissionsFilter(value) {
        const query = this.query;
        query.permissionsFilter = value;
        this.$store.commit('SET_QUERY', query);
      },
      userTypeFilter(value) {
        const query = this.query;
        query.userTypeFilter = value;
        this.$store.commit('SET_QUERY', query);
      },
      facilityFilter(value) {
        const query = this.query;
        query.facilityFilter = value;
        this.$store.commit('SET_QUERY', query);
      },
    },
    beforeMount() {
      // Set all filters initial values here. If the value exists in
      // query, then we use it, otherwise, we default to ALL.
      this.facilityFilter = this.query.facilityFilter || this.facilityOptions[0];
      this.permissionsFilter = this.query.permissionsFilter || this.permissionsOptions[0];
      this.userTypeFilter = this.query.userTypeFilter || this.userTypeOptions[0];
    },
    $trs: {
      devicePermissionsDescription: {
        message: 'Make changes to what users can manage on your device',
        context: "Description on the 'Device permissions' page.",
      },
      searchPlaceholder: {
        message: 'Search for a user…',
        context: "Refers to the search for a user option on the 'Device permissions' page.",
      },
      documentTitle: {
        message: 'Manage Device Permissions',
        context: "Title of the 'Device permissions' page.",
      },
      adminsLabel: {
        message: 'Admins',
        context: "Refers to the filter by user type in the 'Device permissions' page.",
      },
      permissionsLabel: {
        message: 'Permissions',
        context: 'Refers to the Device > Permissions page.',
      },
      canManageContentLabel: {
        message: 'Can manage resources',
        context:
          "One of the options in the 'Permissions' filter on the Device permissions page. Type of permission that allows users to import, export and manage channels and resources in Kolibri.",
      },
      noDevicePermissionsLabel: {
        message: 'No device permissions',
        context: 'Type of permission that can be given to a user.',
      },
      allPermissionsFilterLabel: {
        message: 'All',
        context: 'Refers to the all permissions type filter.',
      },
      allUserTypeFilter: {
        message: 'All',
        context: 'Refer to the all user types filter.',
      },
      allFacilityFilter: {
        message: 'All',
        context:
          'Refers to the all facility filter. Will only display if the user has access to multiple facilities.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '../../styles/definitions';

  .device-container {
    @include device-kpagecontainer;
  }

  .description {
    margin-bottom: 2em;
  }

</style>
