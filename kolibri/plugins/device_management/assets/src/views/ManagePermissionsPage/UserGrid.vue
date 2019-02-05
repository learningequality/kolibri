<template>

  <div>

    <CoreTable>
      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th></th>
        </tr>
      </thead>

      <transition-group slot="tbody" tag="tbody" name="list">
        <tr v-for="user in visibleUsers" :key="user.id">
          <td class="core-table-icon-col">
            <PermissionsIcon
              v-if="Boolean(getPermissionType(user.id))"
              :permissionType="getPermissionType(user.id)"
            />
          </td>
          <td class="core-table-main-col" dir="auto">
            {{ user.full_name }}
            <span v-if="isCurrentUser(user.username)"> ({{ $tr('you') }})</span>
          </td>
          <td>
            {{ user.username }}
          </td>
          <td>
            <KButton
              appearance="flat-button"
              :text="permissionsButtonText(user.username)"
              @click="goToUserPermissionsPage(user.id)"
            />
          </td>
        </tr>
      </transition-group>
    </CoreTable>

    <p v-if="!visibleUsers.length">
      {{ $tr('noUsersMatching', { searchFilter }) }}
    </p>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import KButton from 'kolibri.coreVue.components.KButton';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';

  export default {
    name: 'UserGrid',
    components: {
      KButton,
      PermissionsIcon,
      CoreTable,
    },
    props: {
      searchFilter: {
        type: String,
      },
    },
    computed: {
      ...mapState({
        isCurrentUser: state => username => state.core.session.username === username,
      }),
      ...mapState('managePermissions', {
        facilityUsers: state => state.facilityUsers,
        userPermissions: state => userid => state.permissions[userid],
      }),
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


<style lang="scss" scoped></style>
