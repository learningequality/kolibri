<template>

  <div>
    <CoreTable
      :emptyMessage="emptyMessage"
      :dataLoading="dataLoading"
    >
      <template #headers>
        <th>{{ coreString('fullNameLabel') }}</th>
        <th>{{ coreString('usernameLabel') }}</th>
        <th v-if="hasMultipleFacilities">
          {{ coreString('facilityLabel') }}
        </th>
        <th></th>
      </template>

      <template #tbody>
        <tbody>
          <tr
            v-for="user in facilityUsers"
            :key="user.id"
          >
            <td>
              <KLabeledIcon :label="fullNameLabel(user)">
                <template #icon>
                  <PermissionsIcon
                    v-if="Boolean(getPermissionType(user.id))"
                    :permissionType="getPermissionType(user.id)"
                  />
                </template>
              </KLabeledIcon>
            </td>
            <td>
              <span
                dir="auto"
                class="maxwidth"
              >
                {{ user.username }}
              </span>
            </td>
            <td v-if="hasMultipleFacilities">
              <span
                dir="auto"
                class="maxwidth"
              >
                {{ memoizedFacilityName(user.facility) }}
              </span>
            </td>
            <td class="btn-col">
              <KButton
                appearance="flat-button"
                :text="permissionsButtonText(user)"
                style="margin: 6px"
                @click="goToUserPermissionsPage(user.id)"
              />
            </td>
          </tr>
        </tbody>
      </template>
    </CoreTable>
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import PermissionsIcon from 'kolibri-common/components/labels/PermissionsIcon';
  import memoize from 'lodash/memoize';
  import { PermissionTypes } from 'kolibri/constants';
  import CoreTable from 'kolibri/components/CoreTable';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useUser from 'kolibri/composables/useUser';

  export default {
    name: 'UserGrid',
    components: {
      PermissionsIcon,
      CoreTable,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { currentUserId } = useUser();
      return { currentUserId };
    },
    props: {
      filterText: {
        type: String,
        default: null,
      },
      facilityUsers: {
        type: Array,
        default: () => [],
      },
      userPermissions: {
        type: Function,
        default: () => null,
      },
      dataLoading: {
        type: Boolean,
        default: false,
        required: false,
      },
    },
    computed: {
      ...mapGetters(['facilities']),
      emptyMessage() {
        return this.$tr('noUsersMatching', { searchFilter: this.filterText });
      },
      hasMultipleFacilities() {
        return this.facilities.length > 1;
      },
      // Use a memoized version of the facilityName function to avoid
      // doing extra traversals of 'facilities' array
      memoizedFacilityName() {
        return memoize(this.facilityName);
      },
    },
    methods: {
      facilityName(facilityId) {
        return this.facilities.find(facility => facility.id === facilityId).name || '';
      },
      isCurrentUser(user) {
        return this.currentUserId === user.id;
      },
      fullNameLabel(user) {
        if (this.isCurrentUser(user)) {
          return this.$tr('selfUsernameLabel', { full_name: user.full_name });
        }
        return user.full_name;
      },
      permissionsButtonText(user) {
        if (this.isCurrentUser(user)) {
          return this.$tr('viewPermissions');
        }
        return this.$tr('editPermissions');
      },
      goToUserPermissionsPage(userId) {
        this.$router.push({
          name: 'USER_PERMISSIONS_PAGE',
          params: { userId },
        });
      },
      getPermissionType(userId) {
        const permissions = this.userPermissions(userId);
        if (!permissions) {
          return null;
        } else if (permissions.is_superuser) {
          return PermissionTypes.SUPERUSER;
        } else if (permissions.can_manage_content) {
          return PermissionTypes.LIMITED_PERMISSIONS;
        }
        return null;
      },
    },
    $trs: {
      viewPermissions: {
        message: 'View Permissions',
        context: 'Link to view the permissions of the admin user who is currently logged in.',
      },
      editPermissions: {
        message: 'Edit Permissions',
        context:
          'Option that allows an admin to manage the permissions of another user on the Device.',
      },
      noUsersMatching: {
        message: 'No users match the selected filters',
        context: 'Message displays when a search for a user returns no results.',
      },
      selfUsernameLabel: {
        message: '{full_name} (You)',
        context: 'Indicates the user who is currently signed in at that moment.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .maxwidth {
    display: inline-block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-col {
    padding: 0;
  }

</style>
