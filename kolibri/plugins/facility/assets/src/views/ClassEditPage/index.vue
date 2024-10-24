<template>

  <FacilityAppBarPage>
    <KPageContainer>
      <p>
        <KRouterLink
          :text="coreString('allClassesLabel')"
          :to="$store.getters.facilityPageLinks.ManageClassPage"
          icon="back"
        />
      </p>
      <div>
        <h1
          class="title-header"
          dir="auto"
        >
          <KLabeledIcon
            icon="classes"
            :label="classDetails.name"
          />
        </h1>
        <KButton
          :text="$tr('renameButtonLabel')"
          appearance="basic-link"
          :primary="true"
          @click="displayModal(Modals.EDIT_CLASS_NAME)"
        />
      </div>

      <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

      <!-- Modals -->
      <ClassRenameModal
        v-if="modalShown === Modals.EDIT_CLASS_NAME"
        :classname="classDetails.name"
        :classid="classDetails.id"
        :classes="classes"
        @cancel="closeModal"
      />
      <UserRemoveConfirmationModal
        v-if="modalShown === Modals.REMOVE_USER"
        :classname="classDetails.name"
        :username="userToBeRemoved.username"
        @submit="removalAction({ classId: classDetails.id, userId: userToBeRemoved.id })"
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
            :to="$store.getters.facilityPageLinks.CoachClassAssignmentPage"
            appearance="raised-button"
          />
        </KGridItem>
      </KGrid>

      <UserTable
        :users="classCoaches"
        :emptyMessage="$tr('noCoachesInClassMessge')"
        :dataLoading="dataLoading"
        isCoach
      >
        <!-- Don't need template in Vue 2.5+ -->
        <template #action="userRow">
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
            :to="$store.getters.facilityPageLinks.LearnerClassEnrollmentPage"
            :primary="true"
            appearance="raised-button"
          />
        </KGridItem>
      </KGrid>

      <UserTable
        :users="classLearners"
        :dataLoading="dataLoading"
        :emptyMessage="$tr('noLearnersInClassMessage')"
      >
        <template #action="userRow">
          <KButton
            :text="coreString('removeAction')"
            appearance="flat-button"
            @click="confirmRemoval(userRow.user, removeClassLearner)"
          />
        </template>
      </UserTable>
    </KPageContainer>
  </FacilityAppBarPage>

</template>


<script>

  import { mapState, mapActions } from 'vuex';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UserTable from 'kolibri-common/components/UserTable';
  import { Modals } from '../../constants';
  import FacilityAppBarPage from '../FacilityAppBarPage';
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
      FacilityAppBarPage,
      ClassRenameModal,
      UserTable,
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
        'dataLoading',
      ]),
      classDetails() {
        // No errors due to race condition around currentClass being undefined
        return this.currentClass || {};
      },
      Modals() {
        return Modals;
      },
    },
    methods: {
      ...mapActions('classEditManagement', ['displayModal']),
      closeModal() {
        this.displayModal(false);
      },
      confirmRemoval(user, removalAction) {
        this.userToBeRemoved = user;
        this.removalAction = removalAction;
        this.displayModal(Modals.REMOVE_USER);
      },
      removeClassCoach(args) {
        this.$store.dispatch('classEditManagement/removeClassCoach', args).then(() => {
          this.showSnackbarNotification('coachesRemovedNoCount', { count: 1 });
        });
      },
      removeClassLearner(args) {
        this.$store.dispatch('classEditManagement/removeClassLearner', args).then(() => {
          this.showSnackbarNotification('learnersRemovedNoCount', { count: 1 });
        });
      },
    },
    $trs: {
      enrollLearnerButtonLabel: {
        message: 'Enroll learners',
        context: 'Button on class edit page used to add learners to a class.',
      },
      assignCoachesButtonLabel: {
        message: 'Assign coaches',
        context: 'Button on class edit page which user uses to add a coach to a class.',
      },
      coachEnrollmentPageTitle: {
        message: 'Manage class coaches and learners',
        context: 'Description of class edit page.',
      },
      noCoachesInClassMessge: {
        message: "You don't have any assigned coaches",
        context:
          'This text displays in the edit class page if there are no coaches assigned to a class.',
      },
      noLearnersInClassMessage: {
        message: "You don't have any enrolled learners",
        context:
          'This text displays in the edit class page if there are no learners enrolled in a class.',
      },
      documentTitle: {
        message: 'Edit Class',
        context: 'Page title.',
      },
      renameButtonLabel: {
        message: 'Rename',
        context:
          "Users can change the name of a class using the 'Rename' button beside the class name.",
      },
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
