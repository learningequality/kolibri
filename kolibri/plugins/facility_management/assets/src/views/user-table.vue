<template>

  <div>
    <core-table>

      <thead slot="thead">
        <tr>
          <th class="core-table-icon-col" v-if="selectable">
            <k-checkbox
              @change="selectAll($event)"
              :label="selectAllLabel"
              :showLabel="false"
              :checked="allAreSelected"
            />
          </th>
          <th aria-hidden="true" class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>
            <span class="visuallyhidden">
              {{ $tr('role') }}
            </span>
          </th>
          <th>{{ $tr('username') }}</th>
          <th v-if="$scopedSlots.action" class="user-action-button">
            <span class="visuallyhidden">
              {{ $tr('userActionsColumnHeader') }}
            </span>
          </th>
        </tr>
      </thead>

      <tbody slot="tbody">
        <tr
          v-for="user in users"
          :key="user.id"
        >
          <td class="core-table-icon-col" v-if="selectable">
            <k-checkbox
              @change="selectUser(user.id, $event)"
              :label="userCheckboxLabel"
              :showLabel="false"
              :checked="userIsSelected(user.id)"
            />

          </td>
          <td aria-hidden="true" class="core-table-icon-col">
            <ui-icon>
              <mat-svg name="person" category="social" />
            </ui-icon>
          </td>
          <td>
            {{ user.full_name }}
            <user-role
              aria-hidden="true"
              class="role-badge"
              :role="user.kind"
              :omitLearner="true"
            />
          </td>
          <td class="visuallyhidden">
            {{ user.kind }}
          </td>
          <td>{{ user.username }}</td>
          <td v-if="$scopedSlots.action" class="user-action-button">
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
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import UiIcon from 'keen-ui/src/UiIcon';
  import difference from 'lodash/difference';
  import userRole from './user-role';

  export default {
    name: 'userTable',
    components: {
      coreTable,
      kCheckbox,
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
      },
      emptyMessage: {
        type: String,
      },
      selectable: {
        type: Boolean,
        default: false,
      },
      // TODO bring string into this component after stringfreeze
      selectAllLabel: {
        type: String,
      },
      // TODO bring string into this component after stringfreeze
      userCheckboxLabel: {
        type: String,
      },
      // used for optional checkboxes
      value: {
        type: Array,
        default: null,
      },
    },
    computed: {
      allAreSelected() {
        return Boolean(this.users.length) && this.users.every(user => this.value.includes(user.id));
      },
    },
    methods: {
      userIsSelected(id) {
        return this.value.includes(id);
      },
      selectAll(checked) {
        const currentUsers = this.users.map(user => user.id);
        if (checked) {
          return this.$emit('input', [...this.value, ...currentUsers]);
        }
        return this.$emit('input', difference(this.value, currentUsers));
      },
      selectUser(id, checked) {
        const selected = Array.from(this.value);
        if (checked) {
          selected.push(id);
          return this.$emit('input', selected);
        }
        return this.$emit('input', selected.filter(selectedId => selectedId !== id));
      },
    },
    vuex: {
      getters: {},
      actions: {},
    },
    $trs: {
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

  .empty-message
    margin-bottom: 16px

  .user-action-button
    text-align: right

  .role-badge
    margin-left: 8px

</style>
