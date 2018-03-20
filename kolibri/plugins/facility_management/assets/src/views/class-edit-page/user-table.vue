<template>

  <div>
    <core-table class="user-table">
      <caption class="title">
        {{ title }}
      </caption>

      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('role') }}</th>
          <th>{{ $tr('username') }}</th>
          <th class="user-action-button">
            <span class="visuallyhidden">{{ $tr('userActionsColumnHeader') }}</span>
          </th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr
          v-for="user in users"
          :key="user.id"
        >
          <td class="core-table-icon-col"></td>
          <td class="core-table-icon-col">
            <ui-icon icon="person" />
          </td>
          <td class="core-table-main-col">{{ user.full_name }}</td>
          <td>
            <user-role :role="user.kind" :omitLearner="true" />
          </td>
          <td>{{ user.username }}</td>
          <td>
            <slot name="action" :user="user"></slot>
          </td>
        </tr>
      </tbody>
    </core-table>

    <p
      v-if="!users.length"
      class="empty-message"
    >
      {{ emptyMessage }}
    </p>

  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import userRole from '../user-role';
  import UiIcon from 'keen-ui/src/UiIcon';

  export default {
    name: 'userTable',
    components: {
      coreTable,
      userRole,
      UiIcon,
    },
    props: {
      users: {
        type: Array,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      emptyMessage: {
        type: String,
      },
      selectable: {
        type: Boolean,
        defaul: false,
      },
      // used for optional checkboxes
      value: {
        type: Array,
        default: null,
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

  .title, .empty-message
    margin-bottom: 16px

  .title
    font-size: 24px
    text-align: left
    font-weight: bold

  .empty-message
    text-align: center
    font-weight: bold

  .user-action-button
    text-align: right

</style>
