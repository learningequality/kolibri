<template>

  <div>
    <CoreTable>

      <thead slot="thead">
        <tr>
          <th v-if="selectable" class="core-table-icon-col">
            <KCheckbox
              :label="selectAllLabel"
              :showLabel="false"
              :checked="allAreSelected"
              @change="selectAll($event)"
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
          <td v-if="selectable" class="core-table-icon-col">
            <KCheckbox
              :label="userCheckboxLabel"
              :showLabel="false"
              :checked="userIsSelected(user.id)"
              @change="selectUser(user.id, $event)"
            />

          </td>
          <td aria-hidden="true" class="core-table-icon-col">
            <UiIcon>
              <mat-svg name="person" category="social" />
            </UiIcon>
          </td>
          <td>
            <span dir="auto" class="maxwidth">
              {{ user.full_name }}
            </span>
            <UserTypeDisplay
              aria-hidden="true"
              :userType="user.kind"
              :omitLearner="true"
              class="role-badge"
              :style="{
                color: $coreBgLight,
                backgroundColor: $coreTextAnnotation,
              }"
            />
          </td>
          <td class="visuallyhidden">
            {{ user.kind }}
          </td>
          <td><span class="maxwidth">{{ user.username }}</span></td>
          <td v-if="$scopedSlots.action" class="user-action-button">
            <slot name="action" :user="user"></slot>
          </td>
        </tr>
      </tbody>
    </CoreTable>

    <p
      v-if="!users.length"
      class="empty-message"
    >
      {{ emptyMessage }}
    </p>

  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import UiIcon from 'keen-ui/src/UiIcon';
  import difference from 'lodash/difference';

  export default {
    name: 'UserTable',
    components: {
      CoreTable,
      KCheckbox,
      UserTypeDisplay,
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
      ...mapGetters(['$coreBgLight', '$coreTextAnnotation']),
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


<style lang="scss" scoped>

  .empty-message {
    margin-bottom: 16px;
  }

  .user-action-button {
    text-align: right;
  }

  .role-badge {
    display: inline-block;
    padding-right: 1em;
    padding-left: 1em;
    margin-left: 8px;
    font-size: small;
    white-space: nowrap;
    border-radius: 0.5em;
  }

  .maxwidth {
    display: inline-block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>
