<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="back"
    :immersivePagePrimary="true"
    :primary="true"
    :toolbarTitle="currentGroup.name"
    :appBarTitle="currentGroup.name"
    :immersivePageRoute="$router.getRoute('GroupMembersPage')"
    :pageTitle="pageTitle"
  >
    <KPageContainer>
      <h1>
        {{ $tr('pageHeader', { className: currentGroup.name }) }}
      </h1>
      <form @submit.prevent="addSelectedUsersToGroup">
        <div class="actions-header">
          <FilterTextbox
            v-model.trim="filterInput"
            :placeholder="$tr('searchForUser')"
            @input="pageNum = 1"
          />
        </div>

        <h2>{{ $tr('userTableLabel') }}</h2>

        <div>
          <CoreTable>
            <template #headers>
              <th class="core-table-checkbox-col select-all">
                <KCheckbox
                  :label="$tr('selectAllLabel')"
                  :showLabel="true"
                  :checked="allAreSelected"
                  class="overflow-label"
                  :disabled="visibleFilteredUsers.length === 0"
                  @change="selectAll($event)"
                />
              </th>
              <th>
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
              <th>
                {{ $tr('learnerGroups') }}
              </th>
            </template>

            <template #tbody>
              <tbody>
                <tr
                  v-for="user in visibleFilteredUsers"
                  :key="user.id"
                >
                  <td class="core-table-checkbox-col">
                    <KCheckbox
                      :label="$tr('userCheckboxLabel')"
                      :showLabel="false"
                      :disabled="false"
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
                  <td>
                    <TruncatedItemList :items="getGroupsForLearner(user.id)" />
                  </td>
                </tr>
              </tbody>
            </template>
          </CoreTable>
          <p
            v-if="!visibleFilteredUsers.length"
            class="empty-message"
          >
            {{ emptyMessage }}
          </p>

        </div>

        <nav class="pagination-nav">
          <span class="pagination-label">
            {{ $tr('pagination', {
              visibleStartRange,
              visibleEndRange,
              numFilteredUsers
            }) }}
          </span>
          <KButtonGroup style="margin-top: 8px;">
            <KIconButton
              icon="chevronLeft"
              :ariaLabel="$tr('previousResults')"
              :disabled="pageNum === 1"
              size="small"

              @click="goToPage(pageNum - 1)"
            />
            <KIconButton
              icon="chevronRight"
              :ariaLabel="$tr('nextResults')"
              :disabled="numPages === 0 || pageNum === numPages"
              size="small"

              @click="goToPage(pageNum + 1)"
            />
          </KButtonGroup>
        </nav>

        <div class="footer">
          <KButton
            :text="coreString('confirmAction')"
            :primary="true"
            type="submit"
            :disabled="selectedUsers.length === 0"
          />
        </div>
      </form>
    </KPageContainer>


  </CoreBase>

</template>


<script>

  import { mapActions, mapGetters, mapState } from 'vuex';
  import differenceWith from 'lodash/differenceWith';
  import difference from 'lodash/difference';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import filterUsersByNames from 'kolibri.utils.filterUsersByNames';
  import UserTypeDisplay from 'kolibri.coreVue.components.UserTypeDisplay';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import commonCoach from '../../common';

  export default {
    name: 'GroupEnrollPage',
    components: {
      CoreTable,
      FilterTextbox,
      UserTypeDisplay,
    },
    mixins: [responsiveWindowMixin, commonCoach, commonCoreStrings],
    data() {
      return {
        filterInput: '',
        perPage: 10,
        pageNum: 1,
        selectedUsers: [],
      };
    },
    computed: {
      ...mapState('groups', ['groups', 'classUsers']),
      ...mapGetters('classSummary', ['getGroupNamesForLearner']),
      pageTitle() {
        return this.$tr('pageHeader', { className: this.currentGroup.name });
      },
      allAreSelected() {
        return (
          Boolean(this.visibleFilteredUsers.length) &&
          this.visibleFilteredUsers.every(user => this.selectedUsers.includes(user.id))
        );
      },
      currentGroupUsers() {
        if (this.currentGroup) {
          return this.currentGroup.users;
        }
        return [];
      },
      currentGroup() {
        return this.groups.find(g => g.id === this.$route.params.groupId) || {};
      },
      usersNotInClass() {
        return differenceWith(this.classUsers, this.currentGroupUsers, (a, b) => a.id === b.id);
      },
      sortedFilteredUsers() {
        return filterUsersByNames(this.usersNotInClass, this.filterInput);
      },
      numFilteredUsers() {
        return this.sortedFilteredUsers.length;
      },
      numPages() {
        return Math.ceil(this.numFilteredUsers / this.perPage);
      },
      startRange() {
        return (this.pageNum - 1) * this.perPage;
      },
      visibleStartRange() {
        return Math.min(this.startRange + 1, this.numFilteredUsers);
      },
      endRange() {
        return this.pageNum * this.perPage;
      },
      visibleEndRange() {
        return Math.min(this.endRange, this.numFilteredUsers);
      },
      visibleFilteredUsers() {
        return this.sortedFilteredUsers.slice(this.startRange, this.endRange);
      },
      emptyMessage() {
        if (this.classUsers.length === 0) {
          return this.coreString('noUsersExistLabel');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (this.sortedFilteredUsers.length === 0 && this.filterInput !== '') {
          // TODO internationalize this
          return this.coreString('labelColonThenDetails', {
            label: this.$tr('noUsersMatch'),
            details: this.filterInput,
          });
        }

        return '';
      },
    },
    methods: {
      ...mapActions('groups', ['addUsersToGroup']),
      addSelectedUsersToGroup() {
        this.addUsersToGroup({
          groupId: this.currentGroup.id,
          userIds: this.selectedUsers,
        }).then(() => {
          this.$router.push(this.$router.getRoute('GroupMembersPage'), () => {
            this.showSnackbarNotification('learnersEnrolledNoCount', {
              count: this.selectedUsers.length,
            });
          });
        });
      },
      goToPage(page) {
        this.pageNum = page;
      },
      getGroupsForLearner(learnerId) {
        return this.getGroupNamesForLearner(learnerId);
      },
      userIsSelected(id) {
        return this.selectedUsers.includes(id);
      },
      selectAll(checked) {
        const currentUsers = this.visibleFilteredUsers.map(user => user.id);
        if (checked) {
          this.selectedUsers = [...this.selectedUsers, ...currentUsers];
        } else this.selectedUsers = difference(this.selectedUsers, currentUsers);
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
      pageHeader: "Enroll learners into '{className}'",
      searchForUser: 'Search for a user',
      userTableLabel: 'User List',
      noUsersMatch: 'No users match',
      previousResults: 'Previous results',
      nextResults: 'Next results',
      allUsersAlready: 'All users are already enrolled in this class',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredUsers, number }',
      learnerGroups: 'Current groups',
      role: 'Role',
      selectAllLabel: 'Select all',
      userCheckboxLabel: 'Select user',
    },
  };

</script>


<style lang="scss" scoped>

  .actions-header {
    margin-bottom: 8px;
  }

  .actions-header,
  .footer,
  .pagination-nav {
    text-align: right;
  }
  .pagination-nav {
    margin-bottom: 8px;
  }

  .pagination-label {
    position: relative;
    top: -2px;
    display: inline;
  }

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

</style>
