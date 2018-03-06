<template>

  <core-modal
    :title="$tr('copyLessonTitle')"
    @cancel="closeModal()"
  >
    <!-- Classroom Selection Form -->
    <div v-if="stage===Stages.SELECT_CLASSROOM">
      <p>{{ $tr('copyLessonExplanation') }}</p>
      <form @submit.prevent="goToAvailableGroups()">
        <template v-for="classroom in availableClassrooms">
          <k-radio-button
            :key="classroom.id"
            :label="classroomLabel(classroom)"
            :radiovalue="classroom.id"
            v-model="selectedClassroomId"
          />
        </template>

        <div class="core-modal-buttons">
          <k-button
            :text="$tr('cancel')"
            appearance="flat-button"
            @click="closeModal()"
          />
          <k-button
            type="submit"
            :text="$tr('continue')"
            :primary="true"
          />
        </div>
      </form>
    </div>

    <!-- Learner Group Selection Form -->
    <div v-else>
      <p>{{ $tr('destinationClassroomExplanation', { classroomName: selectedClassroomName }) }}</p>
      <p>{{ $tr('lessonVisibilityQuestion') }}</p>
      <form @submit.prevent="createLessonCopy">
        <recipient-selector
          v-model="selectedCollectionIds"
          :groups="availableGroups"
          :classId="selectedClassroomId"
        />
        <div class="core-modal-buttons">
          <k-button
            :text="$tr('cancel')"
            appearance="flat-button"
            @click="closeModal()"
          />
          <k-button
            type="submit"
            :text="$tr('makeCopy')"
            :primary="true"
          />
        </div>
      </form>
    </div>
  </core-modal>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import find from 'lodash/find';
  import { error as logError } from 'kolibri.lib.logging';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { LearnerGroupResource, LessonResource } from 'kolibri.resources';
  import { createSnackbar, handleApiError } from 'kolibri.coreVue.vuex.actions';
  import RecipientSelector from './RecipientSelector';

  const Stages = {
    SELECT_CLASSROOM: 'SELECT_CLASSROOM',
    SELECT_GROUPS: 'SELECT_GROUPS',
  };

  export default {
    name: 'copyLessonModal',
    components: {
      coreModal,
      kButton,
      kRadioButton,
      RecipientSelector,
    },
    data() {
      return {
        Stages,
        availableGroups: [],
        blockControls: false,
        selectedClassroomId: null,
        selectedCollectionIds: [],
        stage: Stages.SELECT_CLASSROOM,
      };
    },
    computed: {
      selectedClassroomName() {
        if (!this.selectedClassroomId) {
          return '';
        }
        return find(this.classList, { id: this.selectedClassroomId }).name;
      },
      availableClassrooms() {
        // put current classroom on the top
        return sortBy(this.classList, classroom => (this.isCurrentClassroom(classroom) ? -1 : 1));
      },
    },
    created() {
      this.selectedClassroomId = this.classId;
    },
    methods: {
      goToAvailableGroups() {
        // Do nothing if user presses Continue more than once
        if (this.blockControls) {
          return;
        }
        this.blockControls = true;
        // Select Entire Classroom by default
        this.selectedCollectionIds = [this.selectedClassroomId];
        return LearnerGroupResource.getCollection({ parent: this.selectedClassroomId })
          .fetch()
          .then(groups => {
            this.availableGroups = groups;
            this.stage = Stages.SELECT_GROUPS;
            this.blockControls = false;
          })
          .catch(err => {
            this.handleApiError(err);
            logError(err);
            this.blockControls = false;
          });
      },
      classroomLabel(classroom) {
        if (this.isCurrentClassroom(classroom)) {
          return `${classroom.name} ${this.$tr('currentClass')}`;
        }
        return classroom.name;
      },
      closeModal() {
        return this.$emit('cancel');
      },
      // POSTs a new Lesson object to the server
      createLessonCopy() {
        const { title, description, resources } = this.currentLesson;
        const payload = {
          title: this.$tr('copyOfLesson', { lessonTitle: title }).substring(0, 50),
          description,
          resources,
          collection: this.selectedClassroomId,
          lesson_assignments: this.selectedCollectionIds.map(id => ({ collection: id })),
        };
        return LessonResource.createModel(payload)
          .save()
          ._promise.then(() => {
            this.closeModal();
            this.createSnackbar({
              text: this.$tr('copiedLessonTo', { classroomName: this.selectedClassroomName }),
              autoDismiss: true,
            });
          })
          .catch(error => {
            this.handleApiError(error);
            logError(error);
          });
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        classList: state => state.classList,
        isCurrentClassroom: state => classroom => classroom.id === state.classId,
        currentLesson: state => state.pageState.currentLesson,
      },
      actions: {
        createSnackbar,
        handleApiError,
      },
    },
    $trs: {
      copyLessonTitle: 'Copy lesson',
      copyLessonExplanation: 'Copy this lesson to:',
      currentClass: '(current class)',
      continue: 'Continue',
      cancel: 'Cancel',
      makeCopy: 'Copy',
      destinationClassroomExplanation: `This lesson will be copied to '{classroomName}'`,
      lessonVisibilityQuestion: 'Who should this lesson be visible to in this class?',
      copyOfLesson: 'Copy of {lessonTitle}',
      copiedLessonTo: `Copied lesson to '{classroomName}'`,
    },
  };

</script>


<style lang="stylus" scoped></style>
