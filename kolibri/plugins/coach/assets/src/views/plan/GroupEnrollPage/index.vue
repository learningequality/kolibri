<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePagePrimary="false"
    :primary="true"
    :toolbarTitle="$tr('classGroups')"
    :appBarTitle="$tr('classGroups')"
    :immersivePageRoute="$router.getRoute('GroupMembersPage')"
    :pageTitle="pageTitle"
  >
    <KPageContainer>
      <h1>
        {{ $tr('pageHeader', { className: currentGroup.name }) }}
      </h1>
      <form @submit.prevent="addSelectedUsersToGroup">
        <div class="actions-header">
          <KFilterTextbox
            v-model.trim="filterInput"
            :placeholder="$tr('searchForUser')"
            @input="pageNum = 1"
          />
        </div>

        <h2>{{ $tr('userTableLabel') }}</h2>

        <UserTable
          v-model="selectedUsers"
          :users="visibleFilteredUsers"
          :selectable="true"
          :selectAllLabel="$tr('selectAllOnPage')"
          :userCheckboxLabel="$tr('selectUser')"
          :emptyMessage="emptyMessage"
          :infoDescriptor="$tr('learnerGroups')"
        >
          <template slot="info" slot-scope="userRow">
            <TruncatedItemList :items="getGroupsForLearner(userRow.user.id)" />
          </template>
        </UserTable>

        <nav>
          <span>
            {{ $tr('pagination', {
              visibleStartRange,
              visibleEndRange,
              numFilteredUsers
            }) }}
          </span>
          <UiIconButton
            type="primary"
            :ariaLabel="$tr('previousResults')"
            :disabled="pageNum === 1"
            size="small"
            @click="goToPage(pageNum - 1)"
          >
            <mat-svg
              v-if="isRtl"
              name="chevron_right"
              category="navigation"
            />
            <mat-svg
              v-else
              name="chevron_left"
              category="navigation"
            />
          </UiIconButton>
          <UiIconButton
            type="primary"
            :ariaLabel="$tr('nextResults')"
            :disabled="numPages === 0 || pageNum === numPages"
            size="small"
            @click="goToPage(pageNum + 1)"
          >
            <mat-svg
              v-if="isRtl"
              name="chevron_left"
              category="navigation"
            />
            <mat-svg
              v-else
              name="chevron_right"
              category="navigation"
            />
          </UiIconButton>
        </nav>

        <div class="footer">
          <KButton
            :text="$tr('confirmSelectionButtonLabel')"
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
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KButton from 'kolibri.coreVue.components.KButton';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import commonCoach from '../../common';
  import {
    userMatchesFilter,
    filterAndSortUsers,
  } from '../../../../../../facility_management/assets/src/userSearchUtils';
  import UserTable from '../../../../../../facility_management/assets/src/views/UserTable';

  export default {
    name: 'GroupEnrollPage',
    components: {
      KButton,
      UiIconButton,
      KFilterTextbox,
      UserTable,
    },
    mixins: [responsiveWindow, commonCoach],
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
        return filterAndSortUsers(this.usersNotInClass, user =>
          userMatchesFilter(user, this.filterInput)
        );
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
          return this.$tr('noUsersExist');
        }
        if (this.usersNotInClass.length === 0) {
          return this.$tr('allUsersAlready');
        }
        if (this.sortedFilteredUsers.length === 0 && this.filterInput !== '') {
          // TODO internationalize this
          return `${this.$tr('noUsersMatch')}: '${this.filterInput}'`;
        }

        return '';
      },
    },
    methods: {
      ...mapActions('groups', ['addUsersToGroup']),
      ...mapActions(['createSnackbar']),
      addSelectedUsersToGroup() {
        this.addUsersToGroup({
          groupId: this.currentGroup.id,
          userIds: this.selectedUsers,
        }).then(() => {
          this.$router.push(this.$router.getRoute('GroupMembersPage'), () => {
            this.createSnackbar(this.common$tr('updatedNotification'));
          });
        });
      },
      goToPage(page) {
        this.pageNum = page;
      },
      getGroupsForLearner(learnerId) {
        return this.getGroupNamesForLearner(learnerId);
      },
    },
    $trs: {
      pageHeader: "Enroll learners into '{className}'",
      confirmSelectionButtonLabel: 'Confirm',
      searchForUser: 'Search for a user',
      userTableLabel: 'User List',
      noUsersExist: 'No users exist',
      noUsersMatch: 'No users match',
      previousResults: 'Previous results',
      nextResults: 'Next results',
      selectAllOnPage: 'Select all on page',
      allUsersAlready: 'All users are already enrolled in this class',
      selectUser: 'Select user',
      classGroups: 'Groups',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredUsers, number }',
      learnerGroups: 'Current groups',
    },
  };

</script>


<style lang="scss" scoped>

  .actions-header {
    margin-bottom: 8px;
  }

  .actions-header,
  .footer,
  nav {
    text-align: right;
  }

</style>
