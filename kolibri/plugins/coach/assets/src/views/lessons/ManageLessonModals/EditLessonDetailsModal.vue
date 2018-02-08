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
        <k-radio-button
          :radiovalue="true"
          :label="$tr('entireClass')"
          :value="entireClassIsSelected"
          @change="learnerGroups = []"
        />
        <k-checkbox
          v-for="group in groups"
          :key="group.id"
          :label="group.name"
          :checked="groupIsChecked(group.id)"
          @change="toggleGroup($event, group.id)"
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
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import kTextbox from 'kolibri.coreVue.components.kTextbox';
  import { LessonResource } from 'kolibri.resources';
  import { CollectionTypes } from '../../../lessonsConstants';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';
  import { lessonSummaryLink } from '../lessonsRouterUtils';

  export default {
    name: 'lessonDetailsModal',
    components: {
      coreModal,
      kButton,
      kCheckbox,
      kRadioButton,
      kTextbox,
    },
    data() {
      return {
        isInEditMode: false,
        title: '',
        description: '',
        titleIsVisited: false,
        descriptionIsVisited: false,
        learnerGroups: [],
        formIsSubmitted: false,
      };
    },
    computed: {
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
      entireClassIsSelected() {
        return !this.learnerGroups.length;
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
        return !!this.titleIsInvalidText;
      },
      formIsValid() {
        return !this.titleIsInvalid;
      },
      selectedCollectionIds() {
        if (this.learnerGroups.length === 0) {
          return [this.classId];
        } else {
          return [...this.learnerGroups];
        }
      },
      currentCollectionIds() {
        return this.currentLesson.assigned_groups.map(g => g.collection);
      },
      groupsHaveChanged() {
        const unsharedIds = xor(this.selectedCollectionIds, this.currentCollectionIds);
        return unsharedIds.length > 0;
      },
      lessonDetailsHaveChanged() {
        return (
          this.currentLesson.name !== this.title ||
          this.currentLesson.description !== this.description ||
          this.groupsHaveChanged
        );
      },
    },
    created() {
      // If currentLesson is in state, this means we are editing
      if (this.currentLesson) {
        this.isInEditMode = true;
        this.title = this.currentLesson.name;
        this.description = this.currentLesson.description;
        this.learnerGroups = this.currentLesson.assigned_groups
          .filter(g => g.collection_kind === CollectionTypes.LEARNERGROUP)
          .map(g => g.collection);
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
            return this.updateLesson(this.selectedCollectionIds)
              .then(updatedLesson => {
                this.closeModal();
                this.showSuccessSnackbar();
                return this.updateCurrentLesson(updatedLesson);
              })
              .catch(error => {
                // TODO handle error properly
                console.log(error);
              });
          } else {
            return this.createLesson(this.selectedCollectionIds)
              .then(newLesson => {
                this.closeModal();
                this.showSuccessSnackbar();
                return this.$router.push(
                  lessonSummaryLink({ classId: this.classId, lessonId: newLesson.id })
                );
              })
              .catch(error => {
                console.log(error);
              });
          }
        }
      },
      createLesson(assignedGroups) {
        return LessonResource.createModel({
          name: this.title,
          description: this.description,
          resources: [],
          collection: this.classId,
          assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
        }).save();
      },
      updateLesson(assignedGroups) {
        return LessonResource.getModel(this.currentLesson.id).save({
          name: this.title,
          description: this.description,
          assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
        });
      },
      toggleGroup(isChecked, id) {
        if (isChecked) {
          this.learnerGroups.push(id);
        } else {
          this.learnerGroups = this.learnerGroups.filter(groupId => id !== groupId);
        }
      },
      groupIsChecked(groupId) {
        return this.learnerGroups.includes(groupId);
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
      },
      actions: {
        createSnackbar,
        updateCurrentLesson(store, lesson) {
          store.dispatch('SET_CURRENT_LESSON', lesson);
        },
        // POSTs a new Lesson object to the server
        createLesson(store, assignedGroups) {
          const payload = {
            name: this.title,
            description: this.description,
            resources: [],
            collection: this.classId,
            assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
          };

          return LessonResource.createModel(payload).save();
        },
      },
    },
    $trs: {
      // TODO make these labels more semantic
      cancel: 'Cancel',
      changesToLessonSaved: 'Changes to lesson saved',
      continue: 'Continue',
      description: 'Description',
      editingLessonDetails: 'Editing lesson details',
      entireClass: 'Entire class',
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
