<template>

  <div class="user-roster">

    <div class="header">
      <h1>
        {{$tr('tableTitle')}}
      </h1>
    </div>

    <div class="toolbar">
      <div class="searchbar" role="search">
        <mat-svg class="icon" category="action" name="search" aria-hidden="true"/>
        <input
          id="search-field"
          :aria-label="$tr('searchText')"
          type="search"
          v-model="searchFilter"
          :placeholder="$tr('searchText')">
      </div>

      <div class="enroll">
        <router-link :to="classEnrollLink" class="table-name">
          <icon-button
          class="enroll-user-button"
          :text="$tr('enrollUsers')"
          :primary="true"/>
        </router-link>
      </div>

    </div>

    <hr>

    <!-- Modals -->
    <user-remove-modal
      v-if="removeUser"
      :classname="className"
      :classid="classId"
      :username="currentUserRemove.username"
      :userid="currentUserRemove.id"
      @close="closeRemoveUserModal"
    />

    <table class="roster">

      <caption class="visuallyhidden">{{$tr('users')}}</caption>

      <!-- Table Headers -->
      <thead v-if="usersMatchFilter">
        <tr>
          <th class="col-header" scope="col"> {{$tr('fullName')}} </th>
          <th class="col-header table-username" scope="col"> {{$tr('username')}} </th>
          <th class="col-header" scope="col"> {{$tr('role')}} </th>
          <th class="col-header" scope="col"></th>
        </tr>
      </thead>

      <!-- Table body -->
      <tbody v-if="usersMatchFilter">
        <tr v-for="user in visibleUsers">
          <!-- Full Name field -->
          <th scope="row" class="table-cell">
            <span class="table-name">
              {{user.full_name}}
            </span>
          </th>

          <!-- Username field -->
          <td class="table-cell table-username">
            {{user.username}}
          </td>

          <!-- Logic for role tags -->
          <td class="table-cell table-role">
            <span class="user-role">
              {{ user.kind === LEARNER ? $tr('learner') : $tr('coach') }}
            </span>
          </td>

          <!-- Edit field -->
          <td class="table-cell">
            <icon-button
              :text="$tr('remove')"
              class="remove-user-btn"
              @click="openRemoveUserModal(user)">
            </icon-button>
          </td>

        </tr>
      </tbody>

    </table>

    <p v-if="noUsersExist">{{ $tr('noUsersExist') }}</p>
    <p v-if="allUsersFilteredOut">{{ $tr('allUsersFilteredOut') }}</p>

  </div>

</template>


<script>

  const constants = require('../../state/constants');
  const UserKinds = require('kolibri.coreVue.vuex.constants').UserKinds;

  module.exports = {
    $trNameSpace: 'classEnrollPage',
    $trs: {
      enrollUsers: 'Enroll Users',
      tableTitle: 'Manage Learners and Coaches',
      searchText: 'Find a learner or coach...',
      users: 'Users',
      // table info
      fullName: 'Full Name',
      username: 'Username',
      role: 'Role',
      learner: 'Learner',
      coach: 'Coach',
      remove: 'Remove',
      // search-related error messages
      noUsersExist: 'No Users Exist.',
      allUsersFilteredOut: 'No users match the filter.',
    },
    components: {
      'user-remove-modal': require('./user-remove-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
    },
    data: () => ({
      searchFilter: '',
      removeUser: false,
      currentUserRemove: null,
    }),
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      classEnrollLink() {
        return {
          name: constants.PageNames.CLASS_ENROLL_MGMT_PAGE,
          params: { classId: this.classId },
        };
      },
      noUsersExist() {
        return this.users.length === 0;
      },
      allUsersFilteredOut() {
        return !this.noUsersExist && (this.visibleUsers.length === 0);
      },
      usersMatchFilter() {
        return !this.noUsersExist && !this.allUsersFilteredOut;
      },
      visibleUsers() {
        const searchFilter = this.searchFilter;
        const roleFilter = this.roleFilter;

        function matchesText(user) {
          const searchTerms = searchFilter
            .split(' ')
            .filter(Boolean)
            .map(val => val.toLowerCase());

          const fullName = user.full_name.toLowerCase();
          const username = user.username.toLowerCase();

          return searchTerms.every(term => fullName.includes(term) || username.includes(term));
        }

        function matchesRole(user) {
          if (roleFilter === 'all') {
            return true;
          }
          return user.kind === roleFilter;
        }

        return this.users
          .filter(user => matchesText(user) && matchesRole(user))
          .sort((user1, user2) => user1.username.localeCompare(user2.username));
      },
    },
    methods: {
      openRemoveUserModal(user) {
        this.currentUserRemove = user;
        this.removeUser = true;
      },
      closeRemoveUserModal() {
        this.removeUser = false;
        this.currentUserRemove = {};
      },
    },
    vuex: {
      getters: {
        users: state => state.pageState.users,
        classId: state => state.pageState.classId,
        className: state => state.pageState.className,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

  // Padding height that separates rows from eachother
  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

  .toolbar:after
    content: ''
    display: table
    clear: both

  .enroll-user-button
    width: 100%

  .enroll
    float: right

  input[type='search']
    display: inline-block
    box-sizing: border-box
    position: relative
    top: 0
    left: 10px
    height: 100%
    width: 85%
    border-color: transparent
    background-color: transparent
    clear: both

  .header h1
    display: inline-block

  hr
    background-color: $core-text-annotation
    height: 1px
    border: none

  tr
    text-align: left

  .roster
    width: 100%
    word-break: break-all

  th
    text-align: inherit

  .col-header
    padding-bottom: (1.2 * $row-padding)
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%
    width: 30%

  .table-cell
    font-weight: normal // compensates for <th> cells
    padding-bottom: $row-padding
    color: $core-text-default

  .user-role
    background-color: $core-text-annotation
    color: $core-bg-light
    padding-left: 1em
    padding-right: 1em
    border-radius: 40px
    font-size: 0.875em
    display: inline-block
    text-transform: capitalize
    white-space: nowrap

  .searchbar .icon
    display: inline-block
    float: left
    position: relative
    fill: $core-text-annotation
    left: 5px
    top: 5px

  .searchbar
    border-radius: 5px
    padding: inherit
    border: 1px solid #c0c0c0
    width: 300px
    height: $toolbar-height
    float: left
    margin-left: 5px

  @media screen and (min-width: $portrait-breakpoint + 1)
    .searchbar
      font-size: 0.9em
      min-width: 170px
      width: 45%
    #search-field
      width: 80%

  .table-name
    $line-height = 1em
    line-height: $line-height
    max-height: ($line-height * 2)
    display: inline-block
    padding-right: 1em

  @media print
    .toolbar
      display: none
    .user-roster
      width: 500px

  // TODO temporary fix until remove width calculation from learn
  @media screen and (max-width: 840px)
    .create
      box-sizing: border-box
      width: 49%
    .create
      margin-top: -78px
    .searchbar
      font-size: 0.9em
      width: 100%
      margin-top: 5px
      float: right
    .table-username
      display: none
    .table-name
      overflow: hidden
      text-overflow: ellipsis
      white-space: nowrap
      width: 100px
    .col-header
      width: 50%

</style>
