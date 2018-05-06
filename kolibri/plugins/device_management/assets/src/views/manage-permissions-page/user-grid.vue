<template>

  <div>

    <core-table>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th></th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr v-for="user in visibleUsers" :key="user.id">
          <td class="core-table-icon-col">
            <permissions-icon
              v-if="Boolean(getPermissionType(user.id))"
              :permissionType="getPermissionType(user.id)"
            />
          </td>
          <td class="core-table-main-col">
            {{ user.full_name }}
            <span v-if="isCurrentUser(user.username)"> ({{ $tr('you') }})</span>
          </td>
          <td>
            {{ user.username }}
          </td>
          <td>
            <k-button
              @click="goToUserPermissionsPage(user.id)"
              appearance="flat-button"
              :text="permissionsButtonText(user.username)"
            />
          </td>
        </tr>
      </tbody>
    </core-table>

    <p v-if="!visibleUsers.length">
      {{ $tr('noUsersMatching', { searchFilter }) }}
    </p>

  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import permissionsIcon from 'kolibri.coreVue.components.permissionsIcon';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';
  import coreTable from 'kolibri.coreVue.components.coreTable';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';

  export default {
    name: 'userGrid',
    components: {
      kButton,
      permissionsIcon,
      coreTable,
    },
    props: {
      searchFilter: {
        type: String,
      },
    },
    computed: {
      visibleUsers() {
        return filterAndSortUsers(this.facilityUsers, user =>
          userMatchesFilter(user, this.searchFilter)
        );
      },
    },
    methods: {
      permissionsButtonText(username) {
        if (this.isCurrentUser(username)) {
          return this.$tr('viewPermissions');
        }
        return this.$tr('editPermissions');
      },
      goToUserPermissionsPage(userId) {
        this.$router.push({
          path: `/permissions/${userId}`,
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
    vuex: {
      getters: {
        isCurrentUser: ({ core }) => username => core.session.username === username,
        facilityUsers: ({ pageState }) => pageState.facilityUsers,
        userPermissions: state => userid => state.pageState.permissions[userid],
      },
    },
    $trs: {
      viewPermissions: 'View Permissions',
      editPermissions: 'Edit Permissions',
      fullName: 'Full name',
      username: 'Username',
      noUsersMatching: 'No users matching "{searchFilter}"',
      you: 'You',
    },
  };

</script>


<style lang="stylus" scoped></style>
