<template>

  <div>

    <div v-if="visibleUsers.length === 0">
      {{ $tr('noUsersMatching', { searchFilter }) }}
    </div>
    <table v-else class="table">
      <thead class="table-header">
        <tr>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="user in visibleUsers" :key="user.id" class="table-row">
          <td>
            <user-full-name-cell :user="user" />
            <span v-if="isCurrentUser(user.username)" class="align"> ({{ $tr('you') }})</span>
          </td>
          <td>
            {{ user.username }}
          </td>
          <td class="align-right">
            <k-button
              @click="goToUserPermissionsPage(user.id)"
              :raised="false"
              :text="permissionsButtonText(user.username)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>

</template>


<script>

  import kButton from 'kolibri.coreVue.components.kButton';
  import userFullNameCell from './user-full-name-cell';
  import { userMatchesFilter, filterAndSortUsers } from '../../../userSearchUtils';

  export default {
    name: 'userGrid',
    components: {
      kButton,
      userFullNameCell,
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
    },
    vuex: {
      getters: {
        isCurrentUser: ({ core }) => username => core.session.username === username,
        facilityUsers: ({ pageState }) => pageState.facilityUsers,
      },
      actions: {},
    },
    $trs: {
      viewPermissions: 'View Permissions',
      editPermissions: 'Edit Permissions',
      fullName: 'Full Name',
      username: 'Username',
      noUsersMatching: 'No users matching "{searchFilter}"',
      you: 'You',
    },
  };

</script>


<style lang="stylus" scoped>

  .table
    text-align: left
    width: 100%

  .align-right
    text-align: right

  .table-row, thead tr
    border-bottom: 1px solid #D6D6D6

  .table-row:last-child
    border-bottom: none

  .table-header th
    padding: 1em 0
    font-weight: normal
    font-size: 0.8em

  .align
    vertical-align: super

</style>
