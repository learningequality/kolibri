<template>

  <div class="user-roster">

    <!-- Modals -->
    <class-rename-modal
      v-if="showEditNameModal"
      :classname="currClass.name"
      :classid="currClass.id"
    />

    <div id="name-edit-box" @click="openEditNameModal">
      <div id="edit-name" class="name-edit">{{currClass.name}}</div>
      <mat-svg id="edit-icon" class="name-edit" category="image" name="edit" aria-hidden="true"/>
    </div>

    <hr>

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
      v-if="showRemoveUserModal"
      :classname="currClass.name"
      :classid="currClass.id"
      :username="currentUserRemove.username"
      :userid="currentUserRemove.id"
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
          <th scope="row" class="table-cell full-name">
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
            <div class="remove-user-btn" @click="openRemoveUserModal(user)">
              {{$tr('remove')}}
            </div>
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
  const actions = require('../../actions');

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
      'class-rename-modal': require('./class-rename-modal'),
      'user-remove-modal': require('./user-remove-modal'),
      'icon-button': require('kolibri.coreVue.components.iconButton'),
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
        return !this.noUsersExist && (this.visibleUsers.length === 0);
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

        return this.users
          .filter(user => matchesText(user))
          .sort((user1, user2) => user1.username.localeCompare(user2.username));
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
        currClass: state => state.pageState.classes[0], // alway only one item in this array.
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
  $row-padding = 1.5em
  // height of elements in toolbar,  based off of icon-button height
  $toolbar-height = 36px

  #name-edit-box
    display: inline-block
    cursor: pointer

  .name-edit
    float: left

  #edit-name
    font-size: 1.4em

  #edit-icon
    fill: $core-action-normal
    margin-left: 5px

  .toolbar:after
    display: table
    clear: both
    content: ''

  .enroll-user-button
    width: 100%

  .enroll
    float: right

  input[type='search']
    position: relative
    top: 0
    left: 10px
    display: inline-block
    clear: both
    box-sizing: border-box
    width: 85%
    height: 100%
    border-color: transparent
    background-color: transparent

  .header h1
    display: inline-block

  hr
    height: 1px
    border: none
    background-color: $core-text-annotation

  tr
    text-align: left

  tbody tr:nth-child(odd)
    background-color: $core-bg-canvas

  .full-name
    padding-left: 5px

  .roster
    width: 100%
    word-break: break-all

  th
    text-align: inherit

  th, td
    vertical-align: middle

  .remove-user-btn
    margin-right: 4px
    padding: 8px
    width: 90px
    color: $core-action-normal
    font-weight: bold
    cursor: pointer

  .col-header
    padding-bottom: (1.2 * $row-padding)
    width: 30%
    color: $core-text-annotation
    font-weight: normal
    font-size: 80%

  .table-cell
    color: $core-text-default

  .user-role
    display: inline-block
    text-transform: capitalize
    padding-right: 1em
    padding-left: 1em
    border-radius: 40px
    background-color: $core-text-annotation
    color: $core-bg-light
    white-space: nowrap
    font-size: 0.875em

  .searchbar .icon
    position: relative
    top: 5px
    left: 5px
    display: inline-block
    float: left
    fill: $core-text-annotation

  .searchbar
    float: left
    margin-left: 5px
    padding: inherit
    width: 300px
    height: $toolbar-height
    border: 1px solid #c0c0c0
    border-radius: 5px

  @media screen and (min-width: $portrait-breakpoint + 1)
    .searchbar
      min-width: 170px
      width: 45%
      font-size: 0.9em
    #search-field
      width: 80%

  .table-name
    display: inline-block
    padding-right: 1em
    $line-height = 1em
    max-height: ($line-height * 2)
    line-height: $line-height

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
      float: right
      margin-top: 5px
      width: 100%
      font-size: 0.9em
    .table-username
      display: none
    .table-name
      overflow: hidden
      width: 100px
      text-overflow: ellipsis
      white-space: nowrap
    .col-header
      width: 50%

</style>
