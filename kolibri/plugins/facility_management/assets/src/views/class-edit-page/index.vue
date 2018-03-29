<template>

  <div class="user-roster">

    <!-- TODO use grid -->

    <!-- TODO use an icon button for click rather than a div. Accessibility -->
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

    <h2 class="header">
      {{ $tr('coachEnrollmentPageTitle') }}
    </h2>

    <div class="toolbar">
      <div class="enroll">
        <k-router-link
          :text="$tr('assignCoachesButtonLabel')"
          :to="coachAssignmentLink"
          appearance="raised-button"
        />
        <k-router-link
          :text="$tr('enrollLearnerButtonLabel')"
          :to="learnerEnrollmentLink"
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

    <user-remove-confirmation-modal
      v-if="modalShown===Modals.REMOVE_USER"
      @confirm="removalAction(currentClass.id, userToBeRemoved.id)"
      :classname="currentClass.name"
      :username="userToBeRemoved.username"
    />

    <user-table
      :title="$tr('coachTableTitle')"
      :users="classCoaches"
      :emptyMessage="$tr('noCoachesInClassMessge')"
    >
      <!-- Don't need template in Vue 2.5+ -->
      <template slot="action" slot-scope="userRow">
        <k-button
          :text="$tr('remove')"
          @click="confirmRemoval(userRow.user, removeClassCoach)"
        />
      </template>
    </user-table>

    <user-table
      :title="$tr('learnerTableTitle')"
      :users="classLearners"
      :emptyMessage="$tr('noLearnersInClassMessage')"
    >
      <template slot="action" slot-scope="userRow">
        <k-button
          :text="$tr('remove')"
          @click="confirmRemoval(userRow.user, removeClassLearner)"
        />
      </template>
    </user-table>
  </div>

</template>


<script>

  import userTable from '../user-table';
  import { PageNames, Modals } from '../../constants';
  import { removeClassLearner, removeClassCoach } from '../../state/actions/class';
  import { displayModal } from '../../state/actions';
  import classRenameModal from './class-rename-modal';
  import userRemoveConfirmationModal from './user-remove-confirmation-modal';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kButton from 'kolibri.coreVue.components.kButton';

  export default {
    // TODO update component name after string freeze
    name: 'classEnrollForm',
    $trs: {
      enrollLearnerButtonLabel: 'Enroll learners',
      assignCoachesButtonLabel: 'Assign coaches',
      coachEnrollmentPageTitle: 'Manage class coaches and learners',
      coachTableTitle: 'Coaches',
      learnerTableTitle: 'Learners',
      noCoachesInClassMessge: "You don't have any assigned coaches",
      noLearnersInClassMessage: "You don't have any enrolled learners",
      remove: 'Remove',
      noUsersExist: 'No users in this class',
    },
    components: {
      userTable,
      classRenameModal,
      userRemoveConfirmationModal,
      kRouterLink,
      kButton,
    },
    data() {
      return {
        userToBeRemoved: null,
        removalAction: null,
      };
    },
    computed: {
      Modals() {
        return Modals;
      },
      learnerEnrollmentLink() {
        return {
          name: PageNames.CLASS_ENROLL_LEARNER,
        };
      },
      coachAssignmentLink() {
        return {
          name: PageNames.CLASS_ASSIGN_COACH,
        };
      },
    },
    methods: {
      confirmRemoval(user, removalAction) {
        this.userToBeRemoved = user;
        this.removalAction = removalAction;
        this.displayModal(Modals.REMOVE_USER);
      },
    },
    vuex: {
      getters: {
        classLearners: state => state.pageState.classLearners,
        classCoaches: state => state.pageState.classCoaches,
        classes: state => state.pageState.classes,
        currentClass: state => state.pageState.currentClass,
        modalShown: state => state.pageState.modalShown,
      },
      actions: {
        displayModal,
        removeClassLearner,
        removeClassCoach,
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

  .header
    font-weight: normal

  .user-roster
    overflow-x: auto
    overflow-y: hidden

</style>
