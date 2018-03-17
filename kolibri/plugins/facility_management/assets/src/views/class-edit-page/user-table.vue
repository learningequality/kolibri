<template>

  <div>
    <core-table>
      <caption class="visuallyhidden">{{ $tr('users') }}</caption>

      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th class="remove-button-column">
            <span class="visuallyhidden">{{ $tr('userActionsColumnHeader') }}</span>
          </th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr v-for="user in users" :key="user.id">
          <td class="core-table-icon-col">
            <ui-icon icon="person" />
          </td>
          <td class="core-table-main-col">{{ user.full_name }}</td>
          <td>{{ user.username }}</td>
          <td class="remove-button-column">
            <k-button
              appearance="flat-button"
              @click="removeUserClick(user)"
              :text="$tr('remove')"
            />
          </td>
        </tr>
      </tbody>
    </core-table>
  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import kButton from 'kolibri.coreVue.components.kButton';
  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'userTable',
    components: {
      coreTable,
      kButton,
      UiIcon,
    },
    props: {
      users: {
        type: Array,
        required: true,
      },
      removeUserClick: {
        type: Function,
        required: false,
      },
    },
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


<style lang="stylus" scoped>

  .remove-button-column
    text-align: right

</style>
