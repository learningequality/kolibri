<template>

  <div>

    <CoreTable :emptyMessage="emptyMessage">
      <thead slot="thead">
        <tr>
          <th>{{ coreString('fullNameLabel') }}</th>
          <th>{{ coreString('usernameLabel') }}</th>
          <th></th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr v-for="user in facilityUsers" :key="user.id">
          <td>
            <KLabeledIcon :label="fullNameLabel(user)">
              <PermissionsIcon
                v-if="Boolean(getPermissionType(user.id))"
                slot="icon"
                :permissionType="getPermissionType(user.id)"
              />
            </KLabeledIcon>
          </td>
          <td>
            <span dir="auto" class="maxwidth">
              {{ user.username }}
            </span>
          </td>
          <td class="btn-col">
            <KButton
              appearance="flat-button"
              :text="permissionsButtonText(user.username)"
              @click="goToUserPermissionsPage(user.id)"
            />
          </td>
        </tr>
      </tbody>
    </CoreTable>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import PermissionsIcon from 'kolibri.coreVue.components.PermissionsIcon';
  import { PermissionTypes } from 'kolibri.coreVue.vuex.constants';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'UserGrid',
    components: {
      PermissionsIcon,
      CoreTable,
    },
    mixins: [commonCoreStrings],
    props: {
      filterText: {
        type: String,
      },
      facilityUsers: {
        type: Array,
      },
      userPermissions: {
        type: Function,
      },
    },
    computed: {
      ...mapState({
        isCurrentUser: state => username => state.core.session.username === username,
      }),
      emptyMessage() {
        return this.$tr('noUsersMatching', { searchFilter: this.filterText });
      },
    },
    methods: {
      fullNameLabel({ username, full_name }) {
        if (this.isCurrentUser(username)) {
          return this.$tr('selfUsernameLabel', { full_name });
        }
        return full_name;
      },
      permissionsButtonText(username) {
        if (this.isCurrentUser(username)) {
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
      viewPermissions: 'View Permissions',
      editPermissions: 'Edit Permissions',
      noUsersMatching: 'No users matching "{searchFilter}"',
      selfUsernameLabel: '{full_name} (You)',
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
