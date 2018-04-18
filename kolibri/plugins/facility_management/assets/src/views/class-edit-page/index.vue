<template>

  <div class="user-roster">

    <!-- TODO use grid -->

    <div>
      <h1 class="title-header">
        {{ currentClass.name }}
      </h1>
      <ui-icon-button
        icon="mode_edit"
        type="secondary"
        color="primary"
        class="edit-button"
        :ariaLabel="$tr('edit')"
        @click="displayModal(Modals.EDIT_CLASS_NAME)"
      />
    </div>

    <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

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

    <h3 class="section-header">{{ $tr('coachTableTitle') }}</h3>

    <user-table
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

    <h3 class="section-header">{{ $tr('learnerTableTitle') }}</h3>

    <user-table
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
  import uiIconButton from 'keen-ui/src/UiIconButton';
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
      edit: 'Edit class name',
    },
    components: {
      userTable,
      classRenameModal,
      userRemoveConfirmationModal,
      uiIconButton,
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

  .section-header
    margin-top: 32px
    font-size: 18px

  .title-header
    display: inline-block

  .edit-button
    display: inline-block
    position: relative
    left: 10px
    top: -4px

  .user-roster
    overflow-x: auto
    overflow-y: hidden

</style>
