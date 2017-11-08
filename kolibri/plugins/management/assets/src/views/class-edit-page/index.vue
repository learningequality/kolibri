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

    <table class="roster">

      <caption class="visuallyhidden">{{ $tr('users') }}</caption>

      <!-- Table Headers -->
      <thead v-if="usersMatchFilter">
        <tr>
          <th class="col-header table-username" scope="col"> {{ $tr('username') }} </th>
          <th class="col-header" scope="col">
            <span class="visuallyhidden">{{ $tr('role') }}</span>
          </th>
          <th class="col-header" scope="col"> {{ $tr('fullName') }} </th>
          <th class="col-header" scope="col"></th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers" :key="user.id">
          <!-- Username field -->
          <th class="table-cell table-username" scope="col">
            {{ user.username }}
          </th>

          <!-- Logic for role tags -->
          <td class="table-cell table-role">
          </td>

          <!-- Full Name field -->
          <td scope="row" class="table-cell full-name">
            <span class="table-name">
              {{ user.full_name }}
            </span>
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <div class="remove-user-btn" @click="openRemoveUserModal(user)">
              {{ $tr('remove') }}
            </div>
          </td>

        </tr>
      </tbody>

    </table>

    <p class="empty-list" v-if="noUsersExist">{{ $tr('noUsersExist') }}</p>
    <p class="empty-list" v-if="allUsersFilteredOut">{{ $tr('allUsersFilteredOut') }}</p>

  </div>

</template>


<script>

  import * as constants from '../../constants';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import * as actions from '../../state/actions';
  import orderBy from 'lodash/orderBy';
  import classRenameModal from './class-rename-modal';
  import userRemoveModal from './user-remove-modal';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kFilterTextbox from 'kolibri.coreVue.components.kFilterTextbox';
  export default {
    name: 'classEnrollPage',
    $trs: {
      enrollUsers: 'Enroll learners',
      tableTitle: 'Manage learners in this class',
      searchText: 'Find a learner or coach...',
      users: 'Users',
      fullName: 'Full name',
      username: 'Username',
      role: 'Role',
      learner: 'Learner',
      coach: 'Coach',
      remove: 'Remove',
      noUsersExist: 'No users in this class',
      allUsersFilteredOut: 'No matching users',
    },
    components: {
      classRenameModal,
      userRemoveModal,
      kRouterLink,
      kFilterTextbox,
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
          name: constants.PageNames.CLASS_ENROLL_MGMT_PAGE,
          params: { classId: this.currClass.id },
        };
      },
      noUsersExist() {
        return this.users.length === 0;
      },
      allUsersFilteredOut() {
        return !this.noUsersExist && this.visibleUsers.length === 0;
      },
      usersMatchFilter() {
        return !this.noUsersExist && !this.allUsersFilteredOut;
      },
      visibleUsers() {
        const searchFilter = this.searchFilter;
        function matchesText(user) {
          const searchTerms = searchFilter
            .split(' ')
            .filter(Boolean)
            .map(val => val.toLowerCase());
          const fullName = user.full_name.toLowerCase();
          const username = user.username.toLowerCase();
          return searchTerms.every(term => fullName.includes(term) || username.includes(term));
        }
        const filteredUsers = this.users.filter(user => matchesText(user));
        return orderBy(filteredUsers, [user => user.username.toUpperCase()], ['asc']);
      },
      showEditNameModal() {
        return this.modalShown === constants.Modals.EDIT_CLASS_NAME;
      },
      showRemoveUserModal() {
        return this.modalShown === constants.Modals.REMOVE_USER;
      },
    },
    methods: {
      openEditNameModal() {
        this.displayModal(constants.Modals.EDIT_CLASS_NAME);
      },
      openRemoveUserModal(user) {
        this.currentUserRemove = user;
        this.displayModal(constants.Modals.REMOVE_USER);
      },
    },
    vuex: {
      getters: {
        modalShown: state => state.pageState.modalShown,
        users: state => state.pageState.classUsers,
        currClass: state => state.pageState.currentClass,
        classes: state => state.pageState.classes,
      },
      actions: {
        displayModal: actions.displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // Padding height that separates rows from eachother
  $row-padding = 1.8em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

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

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  tbody tr:nth-child(odd)
    background-color: $core-bg-canvas

  .roster
    min-width: 600px
    margin-top: 20px

  th
    text-align: inherit

  th, td
    vertical-align: middle

  .remove-user-btn
    color: $core-action-normal
    font-weight: bold
    width: 90px
    padding: 8px
    cursor: pointer
    margin-right: 4px

  .col-header
    padding-bottom: (0.7 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
    width: 30%

  .table-cell
    color: $core-text-default

  .table-name
    $line-height = 1em
    line-height: $line-height
    max-height: ($line-height * 2)
    display: inline-block

  .user-roster
    overflow-x: auto
    overflow-y: hidden

</style>
