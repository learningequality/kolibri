<template>

  <core-modal
    :title="modalTexts.title"
    @cancel="closeModal()"
    :hasError="showServerError || !formIsValid"
    width="400px"
  >
    <ui-alert
      v-if="showServerError"
      type="error"
      :dismissible="false"
    >
      {{ $tr('submitLessonError') }}
    </ui-alert>

    <form @submit.prevent="submitLessonData">
      <k-textbox
        @blur="titleIsVisited = true"
        ref="titleField"
        :label="$tr('title')"
        :maxlength="50"
        :autofocus="true"
        :invalid="titleIsInvalid"
        :invalidText="titleIsInvalidText"
        v-model="title"
        :disabled="formIsSubmitted"
      />
      <k-textbox
        :label="$tr('description')"
        :maxlength="200"
        :textArea="true"
        v-model="description"
        :disabled="formIsSubmitted"
      />

      <fieldset>
        <legend>{{ $tr('visibleTo') }}</legend>
        <recipient-selector
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
          :disabled="formIsSubmitted"
        />
      </fieldset>

      <div class="core-modal-buttons">
        <k-button
          :text="$tr('cancel')"
          appearance="flat-button"
          @click="closeModal()"
        />
        <k-button
          :text="modalTexts.submitButton"
          type="submit"
          :primary="true"
        />
      </div>
    </form>
  </core-modal>

</template>


<script>

  import xor from 'lodash/xor';
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import RecipientSelector from './RecipientSelector';
  import UiAlert from 'keen-ui/src/UiAlert';
  import { LessonResource } from 'kolibri.resources';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { lessonSummaryLink } from '../lessonsRouterUtils';
  import { LessonsPageNames } from '../../../lessonsConstants';
  import { refreshLessonReport } from '../../../state/actions/lessonReportsActions';

  export default {
    name: 'lessonDetailsModal',
    components: {
      coreModal,
      kButton,
      kTextbox,
      RecipientSelector,
      UiAlert,
    },
    data() {
      return {
        // set default values
        title: this.currentLesson.title,
        description: this.currentLesson.description,
        selectedCollectionIds: this.currentLessonAssignedCollectionIds,
        titleIsVisited: false,
        formIsSubmitted: false,
        showServerError: false,
      };
    },
    computed: {
      formData() {
        return {
          title: this.title,
          description: this.description,
          lesson_assignments: this.selectedCollectionIds.map(groupId => ({ collection: groupId })),
        };
      },
      modalTexts() {
        if (this.isInEditMode) {
          // For existing Lesson
          return {
            title: this.$tr('editingLessonDetails'),
            submitButton: this.$tr('save'),
            snackbarText: this.$tr('changesToLessonSaved'),
          };
        }
        // For new Lesson
        return {
          title: this.$tr('newLesson'),
          submitButton: this.$tr('continue'),
          snackbarText: this.$tr('newLessonCreated'),
        };
      },
      titleIsInvalidText() {
        // submission is handled because "blur" event happens on submit
        if (this.titleIsVisited) {
          if (this.title === '') {
            return this.$tr('required');
          }
        }
        return '';
      },
      titleIsInvalid() {
        return Boolean(this.titleIsInvalidText);
      },
      formIsValid() {
        return !this.titleIsInvalid;
      },
      groupsHaveChanged() {
        const unsharedIds = xor(
          this.selectedCollectionIds,
          this.currentLessonAssignedCollectionIds
        );
        return unsharedIds.length > 0;
      },
      lessonDetailsHaveChanged() {
        return (
          this.currentLesson.title !== this.title ||
          this.currentLesson.description !== this.description ||
          this.groupsHaveChanged
        );
      },
    },
    methods: {
      showSuccessSnackbar() {
        this.createSnackbar({
          text: this.modalTexts.snackbarText,
          autoDismiss: true,
        });
      },
      handleSubmitSuccess() {
        this.closeModal();
        this.showSuccessSnackbar();
      },
      handleSubmitFailure() {
        this.formIsSubmitted = false;
        this.showServerError = true;
      },
      submitLessonData() {
        this.showServerError = false;
        // Return immediately if "submit" has already been clicked
        if (this.formIsSubmitted) {
          // IDEA a loading indictor or something would probably be handy
          return;
        }

        if (this.formIsValid) {
          this.formIsSubmitted = true;

          return this.isInEditMode ? this.updateLesson() : this.createLesson();
        } else {
          // shouldn't ever be true, but being safe
          this.formIsSubmitted = false;
          this.$refs.titleField.focus();
        }
      },
      // probably better suited for actions
      createLesson() {
        return LessonResource.createModel({
          ...this.formData,
          resources: [],
          collection: this.classId,
        })
          .save()
          .then(newLesson => {
            this.handleSubmitSuccess();
            return this.$router.push(
              lessonSummaryLink({ classId: this.classId, lessonId: newLesson.id })
            );
          })
          .catch(() => {
            this.handleSubmitFailure();
          });
      },
      updateLesson() {
        if (!this.lessonDetailsHaveChanged) {
          this.closeModal();
          return Promise.resolve();
        }
        return LessonResource.getModel(this.currentLesson.id)
          .save({ ...this.formData })
          .then(updatedLesson => {
            this.handleSubmitSuccess();
            return this.updateCurrentLesson(updatedLesson);
          })
          .catch(() => {
            this.handleSubmitFailure();
          });
      },
      closeModal() {
        this.$emit('cancel');
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        currentLesson: state => {
          const newLesson = {
            title: '',
            description: '',
          };
          return state.pageState.currentLesson || newLesson;
        },
        groups: state => state.pageState.learnerGroups,
        // If the page name is (Lesson) SUMMARY, then should be in edit mode
        isInEditMode: state => state.pageName === LessonsPageNames.SUMMARY,
        // This only exists in edit mode
        currentLessonAssignedCollectionIds: state => {
          if (state.pageState.currentLesson) {
            return state.pageState.currentLesson.lesson_assignments.map(a => a.collection);
          }
          return [state.classId];
        },
      },
      actions: {
        createSnackbar,
        updateCurrentLesson(store, lesson) {
          store.dispatch('SET_CURRENT_LESSON', lesson);
          return refreshLessonReport(store, lesson.id);
        },
      },
    },
    $trs: {
      cancel: 'Cancel',
      changesToLessonSaved: 'Changes to lesson saved',
      continue: 'Continue',
      description: 'Description',
      editingLessonDetails: 'Edit lesson details',
      newLesson: 'New lesson',
      newLessonCreated: 'New lesson created',
      required: 'This is required',
      save: 'Save',
      submitLessonError: 'There was a problem saving this lesson',
      title: 'Title',
      visibleTo: 'Visible to',
    },
  };

</script>


<style lang="stylus" scoped>

  fieldset
    border: none
    margin: 0
    padding: 0

  legend
    padding-top: 16px
    padding-bottom: 8px

</style>
