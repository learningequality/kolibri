<template>

  <form>

    <PaginatedListContainer
      :items="usersNotInClass"
      :filterPlaceholder="$tr('searchForUser')"
    >
      <template #default="{ items, filterInput }">
        <div>
          <CoreTable>
            <template #headers>
              <th
                class="core-table-checkbox-col select-all"
              >
                <KCheckbox
                  :label="$tr('selectAllLabel')"
                  :showLabel="true"
                  :checked="allAreSelected"
                  class="overflow-label"
                  :disabled="disabled || items.length === 0"
                  @change="selectAll($event)"
                />
              </th>
              <th>
                <!-- "Full name" header visually hidden if checkbox is on -->
                <span class="visuallyhidden">
                  {{ coreString('fullNameLabel') }}
                </span>
              </th>
              <th>
                <span class="visuallyhidden">
                  {{ $tr('role') }}
                </span>
              </th>
              <th>{{ coreString('usernameLabel') }}</th>
            </template>
            <template #tbody>
              <tbody>
                <tr
                  v-for="user in items"
                  :key="user.id"
                >
                  <td class="core-table-checkbox-col">
                    <KCheckbox
                      :label="$tr('userCheckboxLabel')"
                      :showLabel="false"
                      :disabled="disabled"
                      :checked="userIsSelected(user.id)"
                      @change="selectUser(user.id, $event)"
                    />
                  </td>
                  <td>
                    <KLabeledIcon
                      icon="person"
                      :label="user.full_name"
                    />
                    <UserTypeDisplay
                      aria-hidden="true"
                      :userType="user.kind"
                      :omitLearner="true"
                      class="role-badge"
                      :style="{
                        color: $themeTokens.textInverted,
                        backgroundColor: $themeTokens.annotation,
                      }"
                    />
                  </td>
                  <td class="visuallyhidden">
                    {{ user.kind }}
                  </td>
                  <td>
                    <span dir="auto">
                      {{ user.username }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </template>
          </CoreTable>
          <p
            v-if="!items.length"
            class="empty-message"
          >
            {{ emptyMessageForItems(items, filterInput) }}
          </p>

        </div>

      </template>
    </PaginatedListContainer>
    <SelectionBottomBar
      :count="selectedUsers.length"
      :disabled="disabled || selectedUsers.length === 0"
      :type="pageType"
      @click-confirm="$emit('submit', selectedUsers)"
    />

  </form>

</template>


<script>

  import differenceWith from 'lodash/differenceWith';
  import difference from 'lodash/difference';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import SelectionBottomBar from './SelectionBottomBar';

  export default {
    name: 'ClassEnrollForm',
    components: {
      SelectionBottomBar,
      PaginatedListContainer,
      UserTypeDisplay,
      CoreTable,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
    props: {
      facilityUsers: {
        type: Array,
        required: true,
      },
      classUsers: {
        type: Array,
        required: true,
      },
      pageType: {
        type: String,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        selectedUsers: [],
      };
    },
    computed: {
      usersNotInClass() {
        return differenceWith(this.facilityUsers, this.classUsers, (a, b) => a.id === b.id);
      },
      allAreSelected() {
        return (
          Boolean(this.usersNotInClass.length) &&
          this.usersNotInClass.every(user => this.selectedUsers.includes(user.id))
        );
      },
    },
    methods: {
      emptyMessageForItems(items, filterInput) {
        if (this.facilityUsers.length === 0) {
          return this.coreString('noUsersExistLabel');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (items.length === 0 && filterInput !== '') {
          return this.$tr('noUsersMatch', { filterText: filterInput });
        }

        return '';
      },
      selectAll(checked) {
        const currentUsers = this.usersNotInClass.map(user => user.id);
        if (checked) {
          this.selectedUsers = [...this.selectedUsers, ...currentUsers];
        } else this.selectedUsers = difference(this.selectedUsers, currentUsers);
      },
      userIsSelected(id) {
        return this.selectedUsers.includes(id);
      },
      selectUser(id, checked) {
        const selected = Array.from(this.selectedUsers);
        if (checked) {
          selected.push(id);
          this.selectedUsers = selected;
        } else this.selectedUsers = selected.filter(selectedId => selectedId !== id);
      },
    },
    $trs: {
      searchForUser: 'Search for a user',
      // TODO clarify empty state messages after string freeze
      noUsersMatch: 'No users match the filter: "{filterText}"',
      allUsersAlready: 'All users are already enrolled in this class',
      selectAllLabel: 'Select all',
      role: 'Role',
      userCheckboxLabel: 'Select user',
    },
  };

</script>


<style lang="scss" scoped>

  .select-all {
    position: relative;
    // Overrides overflow-x: hidden rule for CoreTable th's
    overflow-x: visible;

    .k-checkbox-container {
      margin-right: -70px;
    }

    .k-checkbox-label {
      // Add extra padding to align label with table headers
      padding-top: 4px;
    }
  }

  .empty-message {
    margin-bottom: 16px;
  }

  .role-badge {
    display: inline-block;
    padding: 0;
    padding-right: 8px;
    padding-left: 8px;
    margin-left: 16px;
    font-size: small;
    white-space: nowrap;
    border-radius: 4px;
  }

  .overflow-label {
    position: absolute;
    top: 8px;
    white-space: nowrap;
  }

  .footer {
    display: flex;
    justify-content: flex-end;
  }

</style>
