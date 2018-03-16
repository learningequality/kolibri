<template>

  <div>
    <!-- <core-table>
      <caption class="visuallyhidden">{{ $tr('users') }}</caption>

      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th>
            <span class="visuallyhidden">{{ $tr('userActions') }}</span>
          </th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr v-for="user in classUsers" :key="user.id">
          <td class="core-table-icon-col">
            <ui-icon icon="person" />
          </td>
          <td class="core-table-main-col">{{ user.full_name }}</td>
          <td>{{ user.username }}</td>
          <td>
            <k-button
            appearance="flat-button"
            @click="openRemoveUserModal(user)"
            :text="$tr('remove')"
            />
          </td>
        </tr>
      </tbody>
    </core-table> -->
  </div>

</template>


<script>

  export default {
    name: 'userTable',
    components: {},
    props: {},
    computed: {},
    methods: {},
    vuex: {
      getters: {},
      actions: {},
    },
    $trs: {
      users: 'Users',
      coachTableTitle: 'Coaches',
      learnerTableTitle: 'Learners',
      fullName: 'Full name',
      username: 'Username',
      role: 'Role',
      userIconColumnHeader: 'User icon',
      userActionsColumnHeader: 'Actions',
      remove: 'Remove',
      noUsersExist: 'No users in this class',
    },
  };

</script>


<style lang="stylus" scoped></style>
