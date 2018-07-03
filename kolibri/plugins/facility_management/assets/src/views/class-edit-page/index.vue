<template>

  <div>

    <div>
      <h1 class="title-header">
        {{ currentClass.name }}
      </h1>
      <ui-icon-button
        type="secondary"
        color="primary"
        class="edit-button"
        :ariaLabel="$tr('edit')"
        @click="displayModal(Modals.EDIT_CLASS_NAME)"
      >
        <mat-svg name="edit" category="image" />
      </ui-icon-button>
    </div>

    <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

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
    <!-- /Modals -->

    <k-grid>
      <k-grid-item size="3" cols="4">
        <h2>{{ $tr('coachTableTitle') }}</h2>
      </k-grid-item>
      <k-grid-item size="1" cols="4" class="right">
        <k-router-link
          :text="$tr('assignCoachesButtonLabel')"
          :to="coachAssignmentLink"
          appearance="raised-button"
        />
      </k-grid-item>
    </k-grid>

    <user-table
      :users="classCoaches"
      :emptyMessage="$tr('noCoachesInClassMessge')"
    >
      <!-- Don't need template in Vue 2.5+ -->
      <template slot="action" slot-scope="userRow">
        <k-button
          :text="$tr('remove')"
          appearance="flat-button"
          @click="confirmRemoval(userRow.user, removeClassCoach)"
        />
      </template>
    </user-table>

    <k-grid class="top-margin">
      <k-grid-item size="3" cols="4">
        <h2>{{ $tr('learnerTableTitle') }}</h2>
      </k-grid-item>
      <k-grid-item size="1" cols="4" class="right">
        <k-router-link
          :text="$tr('enrollLearnerButtonLabel')"
          :to="learnerEnrollmentLink"
          :primary="true"
          appearance="raised-button"
        />
      </k-grid-item>
    </k-grid>

    <user-table
      :users="classLearners"
      :emptyMessage="$tr('noLearnersInClassMessage')"
    >
      <template slot="action" slot-scope="userRow">
        <k-button
          :text="$tr('remove')"
          appearance="flat-button"
          @click="confirmRemoval(userRow.user, removeClassLearner)"
        />
      </template>
    </user-table>
  </div>

</template>


<script>

  import uiIconButton from 'keen-ui/src/UiIconButton';
  import kRouterLink from 'kolibri.coreVue.components.kRouterLink';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kGrid from 'kolibri.coreVue.components.kGrid';
  import kGridItem from 'kolibri.coreVue.components.kGridItem';
  import userTable from '../user-table';
  import { PageNames, Modals } from '../../constants';
  import { removeClassLearner, removeClassCoach } from '../../state/actions/class';
  import { displayModal } from '../../state/actions';
  import classRenameModal from './class-rename-modal';
  import userRemoveConfirmationModal from './user-remove-confirmation-modal';

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
      kGrid,
      kGridItem,
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

  .title-header
    display: inline-block

  .edit-button
    display: inline-block
    position: relative
    left: 10px
    top: -4px
    fill: $core-action-normal

  .right
    text-align: right

  .top-margin
    margin-top: 24px

  // overwrite global styling
  // TODO - find a better way of doing this
  .gutter-24 [class *= 'pure-u'], .gutter-16 [class *= 'pure-u']
    padding: 0

</style>
