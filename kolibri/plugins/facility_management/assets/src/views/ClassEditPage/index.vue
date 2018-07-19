<template>

  <div>

    <div>
      <h1 class="title-header">
        {{ currentClass.name }}
      </h1>
      <UiIconButton
        type="secondary"
        color="primary"
        class="edit-button"
        :ariaLabel="$tr('edit')"
        @click="displayModal(Modals.EDIT_CLASS_NAME)"
      >
        <mat-svg name="edit" category="image" />
      </UiIconButton>
    </div>

    <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

    <!-- Modals -->
    <ClassRenameModal
      v-if="modalShown===Modals.EDIT_CLASS_NAME"
      :classname="currentClass.name"
      :classid="currentClass.id"
      :classes="classes"
    />
    <UserRemoveConfirmationModal
      v-if="modalShown===Modals.REMOVE_USER"
      @confirm="removalAction({ classId: currentClass.id, userId: userToBeRemoved.id })"
      :classname="currentClass.name"
      :username="userToBeRemoved.username"
    />
    <!-- /Modals -->

    <KGrid>
      <KGridItem size="3" cols="4">
        <h2>{{ $tr('coachTableTitle') }}</h2>
      </KGridItem>
      <KGridItem size="1" cols="4" class="right">
        <KRouterLink
          :text="$tr('assignCoachesButtonLabel')"
          :to="coachAssignmentLink"
          appearance="raised-button"
        />
      </KGridItem>
    </KGrid>

    <UserTable
      :users="classCoaches"
      :emptyMessage="$tr('noCoachesInClassMessge')"
    >
      <!-- Don't need template in Vue 2.5+ -->
      <template slot="action" slot-scope="userRow">
        <KButton
          :text="$tr('remove')"
          appearance="flat-button"
          @click="confirmRemoval(userRow.user, removeClassCoach)"
        />
      </template>
    </UserTable>

    <KGrid class="top-margin">
      <KGridItem size="3" cols="4">
        <h2>{{ $tr('learnerTableTitle') }}</h2>
      </KGridItem>
      <KGridItem size="1" cols="4" class="right">
        <KRouterLink
          :text="$tr('enrollLearnerButtonLabel')"
          :to="learnerEnrollmentLink"
          :primary="true"
          appearance="raised-button"
        />
      </KGridItem>
    </KGrid>

    <UserTable
      :users="classLearners"
      :emptyMessage="$tr('noLearnersInClassMessage')"
    >
      <template slot="action" slot-scope="userRow">
        <KButton
          :text="$tr('remove')"
          appearance="flat-button"
          @click="confirmRemoval(userRow.user, removeClassLearner)"
        />
      </template>
    </UserTable>
  </div>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import UiIconButton from 'keen-ui/src/UiIconButton';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import UserTable from '../UserTable';
  import { PageNames, Modals } from '../../constants';
  import ClassRenameModal from './ClassRenameModal';
  import UserRemoveConfirmationModal from './UserRemoveConfirmationModal';

  export default {
    name: 'ClassEditPage',
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
      documentTitle: 'Edit Class',
    },
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      UserTable,
      ClassRenameModal,
      UserRemoveConfirmationModal,
      UiIconButton,
      KGrid,
      KGridItem,
      KRouterLink,
      KButton,
    },
    data() {
      return {
        userToBeRemoved: null,
        removalAction: null,
      };
    },
    computed: {
      ...mapState({
        classLearners: state => state.pageState.classLearners,
        classCoaches: state => state.pageState.classCoaches,
        classes: state => state.pageState.classes,
        currentClass: state => state.pageState.currentClass,
        modalShown: state => state.pageState.modalShown,
      }),
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
      ...mapActions(['displayModal', 'removeClassLearner', 'removeClassCoach']),
      confirmRemoval(user, removalAction) {
        this.userToBeRemoved = user;
        this.removalAction = removalAction;
        this.displayModal(Modals.REMOVE_USER);
      },
    },
  };

</script>


<style lang="scss" scoped>

  @import '~kolibri.styles.definitions';

  .title-header {
    display: inline-block;
  }

  .edit-button {
    position: relative;
    top: -4px;
    left: 10px;
    display: inline-block;
    fill: $core-action-normal;
  }

  .right {
    text-align: right;
  }

  .top-margin {
    margin-top: 24px;
  }

  // overwrite global styling
  // TODO - find a better way of doing this
  .gutter-24 [class*='pure-u'],
  .gutter-16 [class*='pure-u'] {
    padding: 0;
  }

</style>
