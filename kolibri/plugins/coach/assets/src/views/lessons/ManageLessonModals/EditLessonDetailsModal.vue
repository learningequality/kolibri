<template>

  <core-modal
    :title="$tr('lessonDetailsTitle')"
    @cancel="closeModal()"
    width="400px"
  >
    <form @submit.prevent="submitLessonModal">
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
        <legend>{{ $tr('recipient') }}</legend>
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
          :text="$tr('continue')"
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
  import { updateLessons } from '../../../state/actions/lessons';
  import { CollectionTypes } from '../../../lessonsConstants';
  import { createSnackbar } from 'kolibri.coreVue.vuex.actions';

  export default {
    name: 'editLessonDetailsModal',
    components: {
      coreModal,
      kButton,
      kCheckbox,
      kRadioButton,
      kTextbox,
    },
    data() {
      return {
        title: '',
        description: '',
        titleIsVisited: false,
        descriptionIsVisited: false,
        learnerGroups: [],
        formIsSubmitted: false,
      };
    },
    computed: {
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
      (this.title = this.currentLesson.name),
        (this.description = this.currentLesson.description),
        (this.learnerGroups = this.currentLesson.assigned_groups
          .filter(g => g.collection_kind === CollectionTypes.LEARNERGROUP)
          .map(g => g.collection));
    },
    methods: {
      submitLessonModal() {
        if (!this.lessonDetailsHaveChanged) {
          return this.closeModal();
        }
        this.formIsSubmitted = true;
        if (this.formIsValid) {
          return this.updateLessonDetails(this.selectedCollectionIds)
            .then(() => {
              this.closeModal();
              this.createSnackbar({
                text: this.$tr('changesToLessonSaved'),
                autoDismiss: true,
              });
            })
            .catch(error => {
              // TODO handle error properly
              console.log(error);
            });
        }
      },
      updateLessonDetails(assignedGroups) {
        return LessonResource.getModel(this.currentLesson.id)
          .save({
            name: this.title,
            description: this.description,
            assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
          })
          ._promise.then(lesson => this.updateCurrentLesson(lesson));
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
        groups: state => state.pageState.learnerGroups,
        classId: state => state.classId,
        currentLesson: state => state.pageState.currentLesson,
      },
      actions: {
        updateCurrentLesson(store, lesson) {
          store.dispatch('SET_CURRENT_LESSON', lesson);
        },
        // POSTs a new Lesson object to the server
        createNewLesson(store, assignedGroups) {
          const payload = {
            name: this.title,
            description: this.description,
            resources: [],
            collection: this.classId,
            assigned_groups: assignedGroups.map(groupId => ({ collection: groupId })),
          };

          return LessonResource.createModel(payload).save();
        },
        updateLessons,
        createSnackbar,
      },
    },
    $trs: {
      // TODO make these labels more semantic
      cancel: 'Cancel',
      required: 'This is required',
      continue: 'Save',
      description: 'Description',
      entireClass: 'Entire class',
      lessonDetailsTitle: 'Editing lesson details',
      recipient: 'Visible to',
      title: 'Title',
      changesToLessonSaved: 'Changes to lesson saved',
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
