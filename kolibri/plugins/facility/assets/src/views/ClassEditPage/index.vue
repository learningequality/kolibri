<template>

  <KPageContainer>

    <div>
      <h1 class="title-header" dir="auto">
        <KLabeledIcon icon="classroom" :label="currentClass.name" />
      </h1>
      <KButton
        :text="$tr('renameButtonLabel')"
        appearance="basic-link"
        :primary="true"
        :ariaLabel="$tr('edit')"
        @click="displayModal(Modals.EDIT_CLASS_NAME)"
      />
    </div>

    <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

    <!-- Modals -->
    <ClassRenameModal
      v-if="modalShown===Modals.EDIT_CLASS_NAME"
      :classname="currentClass.name"
      :classid="currentClass.id"
      :classes="classes"
      @cancel="closeModal"
    />
    <UserRemoveConfirmationModal
      v-if="modalShown===Modals.REMOVE_USER"
      :classname="currentClass.name"
      :username="userToBeRemoved.username"
      @submit="removalAction({ classId: currentClass.id, userId: userToBeRemoved.id })"
      @cancel="closeModal"
    />
    <!-- /Modals -->

    <KGrid>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h2>{{ coreString('coachesLabel') }}</h2>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
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
      isCoach
    >
      <!-- Don't need template in Vue 2.5+ -->
      <template slot="action" slot-scope="userRow">
        <KButton
          :text="coreString('removeAction')"
          appearance="flat-button"
          @click="confirmRemoval(userRow.user, removeClassCoach)"
        />
      </template>
    </UserTable>

    <KGrid class="top-margin">
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <h2>{{ coreString('learnersLabel') }}</h2>
      </KGridItem>
      <KGridItem
        :layout="{ alignment: 'right' }"
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
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
          :text="coreString('removeAction')"
          appearance="flat-button"
          @click="confirmRemoval(userRow.user, removeClassLearner)"
        />
      </template>
    </UserTable>
  </KPageContainer>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import UserTable from '../UserTable';
  import { PageNames, Modals } from '../../constants';
  import ClassRenameModal from './ClassRenameModal';
  import UserRemoveConfirmationModal from './UserRemoveConfirmationModal';

  export default {
    name: 'ClassEditPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      UserTable,
      ClassRenameModal,
      UserRemoveConfirmationModal,
    },
    mixins: [commonCoreStrings],
    data() {
      return {
        userToBeRemoved: null,
        removalAction: null,
      };
    },
    computed: {
      ...mapState('classEditManagement', [
        'classCoaches',
        'classLearners',
        'classes',
        'currentClass',
        'modalShown',
      ]),
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
      ...mapActions('classEditManagement', [
        'displayModal',
        'removeClassLearner',
        'removeClassCoach',
      ]),
      closeModal() {
        this.displayModal(false);
      },
      confirmRemoval(user, removalAction) {
        this.userToBeRemoved = user;
        this.removalAction = removalAction;
        this.displayModal(Modals.REMOVE_USER);
      },
    },
    $trs: {
      enrollLearnerButtonLabel: 'Enroll learners',
      assignCoachesButtonLabel: 'Assign coaches',
      coachEnrollmentPageTitle: 'Manage class coaches and learners',
      noCoachesInClassMessge: "You don't have any assigned coaches",
      noLearnersInClassMessage: "You don't have any enrolled learners",
      edit: 'Edit class name',
      documentTitle: 'Edit Class',
      renameButtonLabel: 'Edit',
    },
  };

</script>


<style lang="scss" scoped>

  .title-header {
    display: inline-block;
    margin-right: 8px;
  }

  .top-margin {
    margin-top: 24px;
  }

</style>
