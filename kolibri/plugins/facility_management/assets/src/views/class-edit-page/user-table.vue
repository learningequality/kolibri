<template>

  <div>
    <core-table class="user-table">
      <caption class="title">
        {{ title }}
      </caption>

      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>{{ $tr('username') }}</th>
          <th v-if="removeUserClick" class="remove-button-column">
            <span class="visuallyhidden">{{ $tr('userActionsColumnHeader') }}</span>
          </th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr
          v-for="user in users"
          :key="user.id"
        >
          <td class="core-table-icon-col">
            <ui-icon icon="person" />
          </td>
          <td class="core-table-main-col">{{ user.full_name }}</td>
          <td>{{ user.username }}</td>
          <td v-if="removeUserClick" class="remove-button-column">
            <k-button
              appearance="flat-button"
              @click="removeUserClick(user)"
              :text="$tr('remove')"
            />
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
      title: {
        type: String,
        required: true,
      },
      // used for optional remove column
      removeUserClick: {
        type: Function,
        default: null,
      },
      emptyMessage: {
        type: String,
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

  .remove-button-column
    text-align: right

</style>
