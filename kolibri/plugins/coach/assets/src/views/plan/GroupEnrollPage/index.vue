<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    :immersivePagePrimary="false"
    :primary="true"
    :toolbarTitle="groupsPageStrings.$tr('classGroups')"
    :appBarTitle="groupsPageStrings.$tr('classGroups')"
    :immersivePageRoute="$router.getRoute('GroupMembersPage')"
    :pageTitle="pageTitle"
  >
    <KPageContainer>
      <h1>
        {{ learnerClassEnrollmentPageStrings.$tr('pageHeader', { className: currentGroup.name }) }}
      </h1>
      <form @submit.prevent="addSelectedUsersToGroup">
        <div class="actions-header">
          <KFilterTextbox
            v-model.trim="filterInput"
            :placeholder="classEnrollFormStrings.$tr('searchForUser')"
            @input="pageNum = 1"
          />
        </div>

        <h2>{{ classEnrollFormStrings.$tr('userTableLabel') }}</h2>

        <UserTable
          v-model="selectedUsers"
          :users="visibleFilteredUsers"
          :selectable="true"
          :selectAllLabel="classEnrollFormStrings.$tr('selectAllOnPage')"
          :userCheckboxLabel="classEnrollFormStrings.$tr('selectUser')"
          :emptyMessage="emptyMessage"
        />

        <nav>
          <span>
            {{ classEnrollFormStrings.$tr('pagination', {
              visibleStartRange,
              visibleEndRange,
              numFilteredUsers
            }) }}
          </span>
          <UiIconButton
            type="primary"
            :ariaLabel="classEnrollFormStrings.$tr('previousResults')"
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
            :ariaLabel="classEnrollFormStrings.$tr('nextResults')"
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
            :text="classEnrollFormStrings.$tr('confirmSelectionButtonLabel')"
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

  import { mapActions, mapState } from 'vuex';
  import differenceWith from 'lodash/differenceWith';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KButton from 'kolibri.coreVue.components.KButton';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import KFilterTextbox from 'kolibri.coreVue.components.KFilterTextbox';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import commonCoach from '../../common';
  import {
    userMatchesFilter,
    filterAndSortUsers,
  } from '../../../../../../facility_management/assets/src/userSearchUtils';
  import UserTable from '../../../../../../facility_management/assets/src/views/UserTable';
  import ClassEnrollForm from '../../../../../../facility_management/assets/src/views/ClassEnrollForm';
  import LearnerClassEnrollmentPage from '../../../../../../facility_management/assets/src/views/LearnerClassEnrollmentPage';
  import GroupsPage from '../GroupsPage';
  import { groupMgmtStrings } from '../../common/groupManagement/groupManagementStrings';

  const classEnrollFormStrings = crossComponentTranslator(ClassEnrollForm);
  const learnerClassEnrollmentPageStrings = crossComponentTranslator(LearnerClassEnrollmentPage);
  const groupsPageStrings = crossComponentTranslator(GroupsPage);

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
        classEnrollFormStrings,
        groupsPageStrings,
        learnerClassEnrollmentPageStrings,
      };
    },
    computed: {
      ...mapState('groups', ['groups', 'classUsers']),
      pageTitle() {
        return learnerClassEnrollmentPageStrings.$tr('pageHeader', {
          className: this.currentGroup.name,
        });
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
          return this.classEnrollFormStrings.$tr('noUsersExist');
        }
        if (this.usersNotInClass.length === 0) {
          return this.classEnrollFormStrings.$tr('allUsersAlready');
        }
        if (this.sortedFilteredUsers.length === 0 && this.filterInput !== '') {
          // TODO internationalize this
          return `${this.classEnrollFormStrings.$tr('noUsersMatch')}: '${this.filterInput}'`;
        }

        return '';
      },
    },
    methods: {
      ...mapActions('groups', ['addUsersToGroup']),
      ...mapActions(['createSnackbar']),
      addSelectedUsersToGroup() {
        const value = this.selectedUsers.length;
        this.addUsersToGroup({
          groupId: this.currentGroup.id,
          userIds: this.selectedUsers,
        }).then(() => {
          this.$router.push(this.$router.getRoute('GroupMembersPage'), () => {
            this.createSnackbar(groupMgmtStrings.$tr('addedLearnersNotice', { value }));
          });
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
