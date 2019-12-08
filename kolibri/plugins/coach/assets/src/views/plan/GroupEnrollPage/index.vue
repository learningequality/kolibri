<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
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

        <UserTable
          v-model="selectedUsers"
          :users="visibleFilteredUsers"
          :selectable="true"
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
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import FilterTextbox from 'kolibri.coreVue.components.FilterTextbox';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import commonCoach from '../../common';
  import { userMatchesFilter, filterAndSortUsers } from '../../../userSearchUtils';
  import UserTable from '../../../../../../facility/assets/src/views/UserTable';

  export default {
    name: 'GroupEnrollPage',
    components: {
      UiIconButton,
      FilterTextbox,
      UserTable,
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
          return this.coreString('noUsersExistLabel');
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
            this.createSnackbar(this.coachString('updatedNotification'));
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
      searchForUser: 'Search for a user',
      userTableLabel: 'User List',
      noUsersMatch: 'No users match',
      previousResults: 'Previous results',
      nextResults: 'Next results',
      allUsersAlready: 'All users are already enrolled in this class',
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
