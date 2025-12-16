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
      <div class="title-and-options">
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
          hasDropdown
          :text="coreString('optionsLabel')"
        >
          <template #menu>
            <KDropdownMenu
              :options="dropDownOptions"
              @select="handleOptionSelection($event, classDetails)"
            />
          </template>
        </KButton>
      </div>

      <p>{{ $tr('coachEnrollmentPageTitle') }}</p>

      <!-- Modals -->
      <ClassRenameModal
        v-if="modalShown === Modals.EDIT_CLASS_NAME"
        :classname="classDetails.name"
        :classid="classDetails.id"
        :classes="classes"
        @cancel="closeModal"
        @success="closeModal"
      />
      <UserRemoveConfirmationModal
        v-if="modalShown === Modals.REMOVE_USER"
        :classname="classDetails.name"
        :username="userToBeRemoved.username"
        @submit="removalAction({ classId: classDetails.id, userId: userToBeRemoved.id })"
        @cancel="closeModal"
      />
      <ClassCopyModal
        v-if="modalShown === Modals.COPY_CLASS"
        :classToCopy="classToCopy"
        :classes="classes"
        @close="displayModal(false)"
        @success="goToClassesPage"
      />
      <ClassDeleteModal
        v-if="Boolean(classToDelete)"
        :classToDelete="classToDelete"
        @cancel="clearClassToDelete"
        @success="handleDeleteSuccess"
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
            primary
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
  import { ref } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import UserTable from 'kolibri-common/components/UserTable';
  import { bulkUserManagementStrings } from 'kolibri-common/strings/bulkUserManagementStrings';
  import { Modals } from '../../constants.js';
  import FacilityAppBarPage from '../FacilityAppBarPage';
  import ClassCopyModal from '../common/ClassCopyModal.vue';
  import ClassDeleteModal from '../common/ClassDeleteModal';
  import ClassRenameModal from '../common/ClassRenameModal';
  import useDeleteClass from '../../composables/useDeleteClass';
  import UserRemoveConfirmationModal from './UserRemoveConfirmationModal';

  export default {
    name: 'ClassEditPage',
    metaInfo() {
      return {
        title: this.$tr('documentTitle'),
      };
    },
    components: {
      ClassCopyModal,
      ClassDeleteModal,
      FacilityAppBarPage,
      ClassRenameModal,
      UserTable,
      UserRemoveConfirmationModal,
    },
    mixins: [commonCoreStrings],
    setup() {
      const classToCopy = ref({});
      const { copyClass$, renameClassLabel$, deleteClass$ } = bulkUserManagementStrings;
      const { classToDelete, selectClassToDelete, clearClassToDelete } = useDeleteClass();
      return {
        classToCopy,
        copyClass$,
        renameClassLabel$,
        deleteClass$,
        classToDelete,
        selectClassToDelete,
        clearClassToDelete,
      };
    },
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
      dropDownOptions() {
        return [
          {
            label: this.copyClass$(),
            value: 'COPY_CLASS',
            id: 'copy',
          },
          {
            label: this.renameClassLabel$(),
            value: 'EDIT_CLASS_NAME',
            id: 'rename',
          },
          {
            label: this.deleteClass$(),
            value: 'DELETE_CLASS',
            id: 'delete',
          },
        ];
      },
    },
    methods: {
      ...mapActions('classEditManagement', ['displayModal']),
      goToClassesPage() {
        this.$router.push(this.$store.getters.facilityPageLinks.ManageClassPage);
      },
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
        const welcomeDismissalKey = 'DEVICE_WELCOME_MODAL_DISMISSED';
        this.$store.dispatch('classEditManagement/removeClassLearner', args).then(() => {
          window.localStorage.setItem(`${welcomeDismissalKey}-${args.userId}`, true);
          this.showSnackbarNotification('learnersRemovedNoCount', { count: 1 });
        });
      },
      handleDeleteSuccess() {
        this.clearClassToDelete();
        this.goToClassesPage();
      },
      handleOptionSelection(selection, classroom) {
        if (selection.value === Modals.DELETE_CLASS) {
          this.selectClassToDelete(classroom);
          return;
        }
        if (selection.value === Modals.EDIT_CLASS_NAME) {
          this.displayModal(Modals.EDIT_CLASS_NAME);
          return;
        }
        if (selection.value === Modals.COPY_CLASS) {
          this.classToCopy = classroom;
          this.displayModal(Modals.COPY_CLASS);
          return;
        }
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
    },
  };

</script>


<style lang="scss" scoped>

  .title-and-options {
    display: flex;
    flex-direction: row;
    align-content: center;
    align-items: center;
    justify-content: space-between;
  }

  .title-header {
    display: inline;
    margin-right: 8px;
  }

  .top-margin {
    margin-top: 24px;
  }

</style>
