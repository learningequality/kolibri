<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePagePrimary="false"
    :primary="true"
    :toolbarTitle="$tr('groupsHeader')"
    :appBarTitle="$tr('groupsHeader')"
    :immersivePageRoute="$router.getRoute('GroupMembersPage')"
  >
    <h1>
      {{ $tr('enrollLearnersIntoGroup', { groupName: currentGroup.name }) }}
    </h1>
    <form @submit.prevent="addSelectedUsersToGroup">
      <div class="actions-header">
        <KFilterTextbox
          v-model.trim="filterInput"
          :placeholder="$tr('searchForUser')"
          @input="pageNum = 1"
        />
      </div>

      <UiAlert
        v-if="addUsersError"
        type="error"
        :dismissible="false"
      >
        {{ $tr('addUsersError' ) }}
      </UiAlert>

      <h2>{{ $tr('userTableLabel') }}</h2>

      <UserTable
        v-model="selectedUsers"
        :users="visibleFilteredUsers"
        :selectable="true"
        :selectAllLabel="$tr('selectAllOnPage')"
        :userCheckboxLabel="$tr('selectUser')"
        :emptyMessage="emptyMessage"
      />

      <nav>
        <span>
          {{ $tr('pagination', { visibleStartRange, visibleEndRange, numFilteredUsers }) }}
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
          :disabled="pageNum === numPages"
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


  </CoreBase>

</template>


<script>

  import { mapActions, mapState } from 'vuex';
  import differenceWith from 'lodash/differenceWith';
  import UiAlert from 'keen-ui/src/UiAlert';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KButton from 'kolibri.coreVue.components.KButton';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import commonCoach from '../../common';
  import {
    userMatchesFilter,
    filterAndSortUsers,
  } from '../../../../../../facility_management/assets/src/userSearchUtils';
  import UserTable from '../../../../../../facility_management/assets/src/views/UserTable.vue';

  export default {
    name: 'GroupEnrollPage',
    components: {
      KButton,
      UiIconButton,
      KFilterTextbox,
      UiAlert,
      UserTable,
    },
    metaInfo() {
      return {
        title: this.$tr('enrollLearnersIntoGroup', { groupName: this.currentGroup.name }),
      };
    },
    mixins: [responsiveWindow, commonCoach],
    $trs: {
      enrollLearnersIntoGroup: `Enroll learners into '{groupName}'`,
      groupsHeader: 'Groups',
      confirmSelectionButtonLabel: 'Confirm',
      searchForUser: 'Search for a user',
      userIconColumnHeader: 'User Icon',
      name: 'Full name',
      username: 'Username',
      userTableLabel: 'User List',
      role: 'Role',
      // TODO clarify empty state messages after string freeze
      noUsersExist: 'No users exist',
      noUsersSelected: 'No users are selected',
      noUsersMatch: 'No users match',
      previousResults: 'Previous results',
      nextResults: 'Next results',
      selectAllOnPage: 'Select all on page',
      allUsersAlready: 'All users are already enrolled in this group',
      search: 'Search',
      selectUser: 'Select user',
      addUsersError: 'There was a problem adding users to this group',
      pagination:
        '{ visibleStartRange, number } - { visibleEndRange, number } of { numFilteredUsers, number }',
    },
    data() {
      return {
        filterInput: '',
        perPage: 10,
        pageNum: 1,
        selectedUsers: [],
        addUsersError: false,
      };
    },
    computed: {
      ...mapState('groups', ['groups', 'classUsers']),
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
      filteredUsers() {
        return this.usersNotInClass.filter(user => userMatchesFilter(user, this.filterInput));
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
      showConfirmEnrollmentModal() {
        return this.modalShown === true;
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
      addSelectedUsersToGroup() {
        this.addUsersError = false;
        this.addUsersToGroup({
          groupId: this.currentGroup.id,
          userIds: this.selectedUsers,
        })
          .then(() => {
            this.$router.push(this.$router.getRoute('GroupMembersPage'));
          })
          .catch(() => {
            this.addUsersError = true;
          });
      },
      reducePageNum() {
        while (this.visibleFilteredUsers.length === 0 && this.pageNum > 1) {
          this.pageNum = this.pageNum - 1;
        }
      },
      goToPage(page) {
        this.pageNum = page;
      },
      pageWithinRange(page) {
        const maxOnEachSide = 1;
        if (this.pageNum === 1 || this.pageNum === this.numPages) {
          return Math.abs(this.pageNum - page) <= maxOnEachSide + 1;
        }
        return Math.abs(this.pageNum - page) <= maxOnEachSide;
      },
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
