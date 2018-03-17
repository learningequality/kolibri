<template>

  <div class="user-roster">

    <!-- TODO use grid -->

    <div
      id="name-edit-box"
      @click="displayModal(Modals.EDIT_CLASS_NAME)"
    >
      <div
        id="edit-name"
        class="name-edit"
      >
        {{ currentClass.name }}
      </div>
      <mat-svg
        id="edit-icon"
        class="name-edit"
        category="image"
        name="edit"
        aria-hidden="true"
      />
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
          :to="classEnrollLink(currentClass.id)"
          :primary="true"
          appearance="raised-button"
        />
      </div>
    </div>

    <!-- Modals -->
    <class-rename-modal
      v-if="modalShown===Modals.EDIT_CLASS_NAME"
      :classname="currentClass.name"
      :classid="currentClass.id"
      :classes="classes"
    />

    <user-remove-modal
      v-if="modalShown===Modals.REMOVE_USER"
      :classname="currentClass.name"
      :classid="currentClass.id"
      :username="userToBeRemoved.username"
      :userid="userToBeRemoved.id"
    />

    <user-table
      :title="$tr('coachTableTitle')"
      :users="[]"
      :emptyMessage="$tr('noCoachesInClassMessge')"
    />

    <user-table
      :title="$tr('learnerTableTitle')"
      :users="classUsers"
      :removeUserClick="openRemoveUserModal"
      :emptyMessage="$tr('noLearnersInClassMessage')"
    />
  </div>

</template>


<script>

  import userTable from './user-table';
  import { PageNames, Modals } from '../../constants';
  import { UserKinds } from 'kolibri.coreVue.vuex.constants';
  import { displayModal } from '../../state/actions';
  import classRenameModal from './class-rename-modal';
  import userRemoveModal from './user-remove-modal';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';

  function classEnrollLink(classId) {
    return {
      name: PageNames.CLASS_ENROLL_MGMT_PAGE,
      params: { classId },
    };
  }

  export default {
    // QUESTION update component name?
    name: 'classEnrollPage',
    $trs: {
      // TODO kill
      enrollUsers: 'Enroll users ',
      enrollLearnerButtonLabel: 'Enroll learners',
      assignCoachesButtonLabel: 'Assign coaches',
      // TODO kill
      tableTitle: 'Manage users in this class',
      coachEnrollmentPageTitle: 'Manage class coaches and learners',
      // TODO kill | deprecated
      users: 'Users',
      coachTableTitle: 'Coaches',
      learnerTableTitle: 'Learners',
      noCoachesInClassMessge: "You don't have any assigned coaches",
      noLearnersInClassMessage: "You don't have any enrolled learners",
      userIconColumnHeader: 'User icon',
      fullName: 'Full name',
      username: 'Username',
      role: 'Role',
      userActionsColumnHeader: 'Actions',
      remove: 'Remove',
      noUsersExist: 'No users in this class',
      userActions: 'User management actions',
    },
    components: {
      userTable,
      classRenameModal,
      userRemoveModal,
      kRouterLink,
    },
    data: () => ({
      userToBeRemoved: null,
    }),
    computed: {
      LEARNER: () => UserKinds.LEARNER,
      COACH: () => UserKinds.COACH,
      Modals: () => Modals,
    },
    methods: {
      openRemoveUserModal(user) {
        this.userToBeRemoved = user;
        this.displayModal(Modals.REMOVE_USER);
      },
      classEnrollLink,
    },
    vuex: {
      getters: {
        classUsers: state => state.pageState.classUsers,
        classes: state => state.pageState.classes,
        currentClass: state => state.pageState.currentClass,
        modalShown: state => state.pageState.modalShown,
        noUsersInClass: state => state.pageState.classUsers.length === 0,
      },
      actions: {
        displayModal,
      },
    },
  };

</script>


<style lang="stylus" scoped>

  @require '~kolibri.styles.definitions'

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

  .user-roster
    overflow-x: auto
    overflow-y: hidden

</style>
