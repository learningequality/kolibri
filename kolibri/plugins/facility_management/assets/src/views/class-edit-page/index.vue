<template>

  <div class="user-roster">

    <!-- Modals -->
    <class-rename-modal
      v-if="showEditNameModal"
      :classname="currClass.name"
      :classid="currClass.id"
      :classes="classes"
    />

    <div id="name-edit-box" @click="openEditNameModal">
      <div id="edit-name" class="name-edit">{{ currClass.name }}</div>
      <mat-svg id="edit-icon" class="name-edit" category="image" name="edit" aria-hidden="true" />
    </div>

    <div class="header">
      <h2 class="table-title">
        {{ $tr('tableTitle') }}
      </h2>
    </div>

    <div class="toolbar">
      <div class="enroll">
        <k-router-link
          :text="$tr('enrollUsers')"
          :to="classEnrollLink"
          :primary="true"
          appearance="raised-button"
        />
      </div>
      <k-filter-textbox
        :placeholder="$tr('searchText')"
        v-model="searchFilter"
        class="searchbar"
      />
    </div>

    <!-- Modals -->
    <user-remove-modal
      v-if="showRemoveUserModal"
      :classname="currClass.name"
      :classid="currClass.id"
      :username="currentUserRemove.username"
      :userid="currentUserRemove.id"
    />

    <core-table>
      <caption class="visuallyhidden">{{ $tr('users') }}</caption>

      <thead slot="thead" v-if="usersMatchFilter">
        <tr>
          <th class="core-table-icon-col"></th>
          <th>{{ $tr('fullName') }}</th>
          <th>
            <span class="visuallyhidden">{{ $tr('role') }}</span>
          </th>
          <th>{{ $tr('username') }}</th>
          <th>
            <span class="visuallyhidden">{{ $tr('userActions') }}</span>
          </th>
        </tr>
      </thead>

      <tbody slot="tbody" v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers" :key="user.id">
          <td class="core-table-icon-col">
            <ui-icon icon="person" />
          </td>
          <td class="core-table-main-col"><span>{{ user.full_name }}</span></td>
          <td></td>
          <td>{{ user.username }}</td>
          <td>
            <k-button
              appearance="flat-button"
              @click="openRemoveUserModal(user)"
              :text="$tr('remove')"
            />
          </td>
        </tr>
      </tbody>

    </core-table>

    <p class="empty-list" v-if="noUsersExist">{{ $tr('noUsersExist') }}</p>
    <p class="empty-list" v-if="allUsersFilteredOut">{{ $tr('allUsersFilteredOut') }}</p>

  </div>

</template>


<script>

  import coreTable from 'kolibri.coreVue.components.coreTable';
  import UiIcon from 'keen-ui/src/UiIcon';
  import { PageNames, Modals } from '../../constants';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { displayModal } from '../../state/actions';
  import orderBy from 'lodash/orderBy';
  import classRenameModal from './class-rename-modal';
  import userRemoveModal from './user-remove-modal';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  import { userMatchesFilter, filterAndSortUsers } from '../../userSearchUtils';

  export default {
    name: 'classEnrollPage',
    $trs: {
      enrollUsers: 'Enroll users ',
      tableTitle: 'Manage users in this class',
      searchText: 'Find a user...',
      users: 'Users',
      fullName: 'Full name',
      username: 'Username',
      role: 'Role',
      remove: 'Remove',
      noUsersExist: 'No users in this class',
      allUsersFilteredOut: 'No matching users',
      userActions: 'User management actions',
    },
    components: {
      coreTable,
      classRenameModal,
      userRemoveModal,
      kButton,
      kRouterLink,
      kFilterTextbox,
      UiIcon,
    },
    data: () => ({
      searchFilter: '',
      currentUserRemove: null,
    }),
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      classEnrollLink() {
        return {
          name: PageNames.CLASS_ENROLL_MGMT_PAGE,
          params: { classId: this.currClass.id },
        };
      },
      noUsersExist() {
        return this.classUsers.length === 0;
      },
      allUsersFilteredOut() {
        return !this.noUsersExist && this.visibleUsers.length === 0;
      },
      usersMatchFilter() {
        return !this.noUsersExist && !this.allUsersFilteredOut;
      },
      visibleUsers() {
        return filterAndSortUsers(
          this.classUsers,
          user => userMatchesFilter(user, this.searchFilter),
          'full_name'
        );
      },
      showEditNameModal() {
        return this.modalShown === Modals.EDIT_CLASS_NAME;
      },
      showRemoveUserModal() {
        return this.modalShown === Modals.REMOVE_USER;
      },
    },
    methods: {
      openEditNameModal() {
        this.displayModal(Modals.EDIT_CLASS_NAME);
      },
      openRemoveUserModal(user) {
        this.currentUserRemove = user;
        this.displayModal(Modals.REMOVE_USER);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
        classUsers: state => state.pageState.classUsers,
        currClass: state => state.pageState.currentClass,
        classes: state => state.pageState.classes,
      },
      actions: {
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

  .toolbar
    margin-bottom: 32px

  .searchbar
    margin-top: 5px

  #name-edit-box
    display: inline-block
    cursor: pointer
    margin: 15px 0 5px

  .name-edit
    float: left

  #edit-name
    font-size: 1.5em
    font-weight: bold

  #edit-icon
    fill: $core-action-normal
    margin: 2px 0 0 5px

  .toolbar:after
    content: ''
    display: table
    clear: both

  .enroll-user-button
    width: 100%

  .enroll
    float: right

  .empty-list
    color: $core-text-annotation
    margin-left: 10px

  .header h2
    display: inline-block
    font-weight: normal

  .remove-user-btn
    color: $core-action-normal
    font-weight: bold
    width: 90px
    padding: 8px
    cursor: pointer
    margin-right: 4px

  .user-roster
    overflow-x: auto
    overflow-y: hidden

</style>
