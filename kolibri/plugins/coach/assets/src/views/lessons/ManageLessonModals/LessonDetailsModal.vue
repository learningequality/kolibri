<template>

  <core-modal
    :title="modalTexts.title"
    @cancel="closeModal()"
    width="400px"
  >
    <form @submit.prevent="submitLessonData">
      <k-textbox
        :label="$tr('title')"
        :maxlength="50"
        :autofocus="true"
        :invalid="titleIsInvalid"
        :invalidText="titleIsInvalidText"
        v-model="title"
      />
      <k-textbox
        :label="$tr('description')"
        :maxlength="200"
        :textArea="true"
        v-model="description"
      />

      <fieldset>
        <legend>{{ $tr('visibleTo') }}</legend>
        <recipient-selector
          v-model="selectedCollectionIds"
          :groups="groups"
          :classId="classId"
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
  import { LessonResource } from 'kolibri.resources';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { lessonSummaryLink } from '../lessonsRouterUtils';
  import RecipientSelector from './RecipientSelector';
  import { LessonsPageNames } from '../../../lessonsConstants';

  export default {
    name: 'lessonDetailsModal',
    components: {
      coreModal,
      kButton,
      kTextbox,
      RecipientSelector,
    },
    data() {
      return {
        title: '',
        description: '',
        titleIsVisited: false,
        descriptionIsVisited: false,
        selectedCollectionIds: [],
        formIsSubmitted: false,
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
        if (this.titleIsVisited || this.formIsSubmitted) {
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
      currentCollectionIds() {
        return this.currentLesson.lesson_assignments.map(a => a.collection);
      },
      groupsHaveChanged() {
        const unsharedIds = xor(this.selectedCollectionIds, this.currentCollectionIds);
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
    created() {
      if (this.isInEditMode) {
        this.title = this.currentLesson.title;
        this.description = this.currentLesson.description;
        this.selectedCollectionIds = this.currentLesson.lesson_assignments.map(a => a.collection);
      } else {
        this.selectedCollectionIds = [this.classId];
      }
    },
    methods: {
      showSuccessSnackbar() {
        this.createSnackbar({
          text: this.modalTexts.snackbarText,
          autoDismiss: true,
        });
      },
      submitLessonData() {
        if (this.isInEditMode && !this.lessonDetailsHaveChanged) {
          return this.closeModal();
        }
        this.formIsSubmitted = true;
        if (this.formIsValid) {
          if (this.isInEditMode) {
            return this.updateLesson()
              .then(updatedLesson => {
                this.closeModal();
                this.showSuccessSnackbar();
                return this.updateCurrentLesson(updatedLesson);
              })
              .catch(error => {
                // TODO handle error properly
                console.log(error); // eslint-disable-line
              });
          } else {
            return this.createLesson()
              .then(newLesson => {
                this.closeModal();
                this.showSuccessSnackbar();
                return this.$router.push(
                  lessonSummaryLink({ classId: this.classId, lessonId: newLesson.id })
                );
              })
              .catch(error => {
                console.log(error); // eslint-disable-line
              });
          }
        }
      },
      createLesson() {
        return LessonResource.createModel({
          ...this.formData,
          resources: [],
          collection: this.classId,
        }).save();
      },
      updateLesson() {
        return LessonResource.getModel(this.currentLesson.id).save({ ...this.formData });
      },
      closeModal() {
        this.$emit('cancel');
      },
    },
    vuex: {
      getters: {
        classId: state => state.classId,
        currentLesson: state => state.pageState.currentLesson || null,
        groups: state => state.pageState.learnerGroups,
        // If the page name is (Lesson) SUMMARY, then should be in edit mode
        isInEditMode: state => state.pageName === LessonsPageNames.SUMMARY,
      },
      actions: {
        createSnackbar,
        updateCurrentLesson(store, lesson) {
          store.dispatch('SET_CURRENT_LESSON', lesson);
        },
      },
    },
    $trs: {
      // TODO make these labels more semantic
      cancel: 'Cancel',
      changesToLessonSaved: 'Changes to lesson saved',
      continue: 'Continue',
      description: 'Description',
      editingLessonDetails: 'Edit lesson details',
      newLesson: 'New lesson',
      newLessonCreated: 'New lesson created',
      required: 'This is required',
      save: 'Save',
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
