<template>

  <div>
    <CoreTable>

      <thead slot="thead">
        <tr>
          <th v-if="selectable" class="core-table-checkbox-col">
            <KCheckbox
              :label="selectAllLabel"
              :showLabel="false"
              :checked="allAreSelected"
              @change="selectAll($event)"
            />
          </th>
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

      <transition-group slot="tbody" tag="tbody" name="list">
        <tr
          v-for="user in users"
          :key="user.id"
        >
          <td v-if="selectable" class="core-table-checkbox-col">
            <KCheckbox
              :label="userCheckboxLabel"
              :showLabel="false"
              :checked="userIsSelected(user.id)"
              @change="selectUser(user.id, $event)"
            />
          </td>
          <td>
            <span dir="auto" class="maxwidth">
              <KLabeledIcon>
                <KIcon
                  slot="icon"
                  :coach="isCoach"
                  :person="!isCoach"
                />
                {{ user.full_name }}
              </KLabeledIcon>
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
          <td>
            <span dir="auto" class="maxwidth">
              {{ user.username }}
            </span>
          </td>
          <td v-if="$scopedSlots.action" class="user-action-button">
            <slot name="action" :user="user"></slot>
          </td>
        </tr>
      </transition-group>
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

  import themeMixin from 'kolibri.coreVue.mixins.themeMixin';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import KCheckbox from 'kolibri.coreVue.components.KCheckbox';
  import KLabeledIcon from 'kolibri.coreVue.components.KLabeledIcon';
  import KIcon from 'kolibri.coreVue.components.KIcon';
  import difference from 'lodash/difference';

  export default {
    name: 'UserTable',
    components: {
      CoreTable,
      KCheckbox,
      UserTypeDisplay,
      KLabeledIcon,
      KIcon,
    },
    mixins: [themeMixin],
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
      isCoach: {
        type: Boolean,
        default: false,
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
    padding: 0;
    text-align: right;
  }

  .role-badge {
    position: relative;
    top: -4px;
    display: inline-block;
    padding: 2px;
    padding-right: 8px;
    padding-left: 8px;
    margin-left: 16px;
    font-size: small;
    white-space: nowrap;
    border-radius: 4px;
  }

  .maxwidth {
    display: inline-block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

</style>
