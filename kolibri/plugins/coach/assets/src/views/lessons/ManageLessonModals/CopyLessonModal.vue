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
        <k-radio-button
          :radiovalue="true"
          :label="$tr('entireClass')"
          :value="entireClassIsSelected"
          @change="selectedGroupIds=[]"
        />
        <k-checkbox
          v-for="group in availableGroups"
          :key="group.id"
          :label="group.name"
          :checked="groupIsChecked(group.id)"
          @change="toggleGroup($event, group.id)"
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
  import coreModal from 'kolibri.coreVue.components.coreModal';
  import kButton from 'kolibri.coreVue.components.kButton';
  import kCheckbox from 'kolibri.coreVue.components.kCheckbox';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { LearnerGroupResource, LessonResource } from 'kolibri.resources';

  const Stages = {
    SELECT_CLASSROOM: 'SELECT_CLASSROOM',
    SELECT_GROUPS: 'SELECT_GROUPS',
  };

  export default {
    name: 'copyLessonModal',
    components: {
      coreModal,
      kButton,
      kCheckbox,
      kRadioButton,
    },
    data() {
      return {
        Stages,
        availableGroups: [],
        blockControls: false,
        selectedClassroomId: null,
        selectedGroupIds: [],
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
      entireClassIsSelected() {
        return this.selectedGroupIds.length === 0;
      },
      availableClassrooms() {
        // put current classroom on the top
        return sortBy(this.classList, classroom => this.isCurrentClassroom(classroom) ? -1 : 1);
      },
      selectedCollectionIds() {
        if (this.entireClassIsSelected) {
          return [this.selectedClassroomId];
        } else {
          return [...this.selectedGroupIds];
        }
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
        return LearnerGroupResource.getCollection({ parent: this.selectedClassroomId }).fetch()
          .then(groups => {
            this.availableGroups = groups;
            this.stage = Stages.SELECT_GROUPS;
            this.blockControls = false;
          })
          .catch((err) => {
            console.log(err);
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
      groupIsChecked(groupId) {
        return this.selectedGroupIds.includes(groupId);
      },
      toggleGroup(isChecked, id) {
        if (isChecked) {
          this.selectedGroupIds.push(id);
        } else {
          this.selectedGroupIds = this.selectedGroupIds.filter(groupId => id !== groupId);
        }
      },
      // POSTs a new Lesson object to the server
      createLessonCopy() {
        const { name, description, resources } = this.currentLesson;
        const payload = {
          name: this.$tr('copyOfLesson', { lessonName: name }).substring(0, 50),
          description,
          resources,
          collection: this.selectedClassroomId,
          assigned_groups: this.selectedCollectionIds.map(id => ({ collection: id })),
        };
        return LessonResource.createModel(payload).save()
          ._promise
          .then(() => this.closeModal())
          .catch(error => {
            console.log(error);
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
    },
    $trs: {
      copyLessonTitle: 'Copy to class',
      copyLessonExplanation: 'Send a copy of this lesson to another class',
      currentClass: '(current class)',
      continue: 'Continue',
      cancel: 'Cancel',
      makeCopy: 'Make copy',
      entireClass: 'Entire class',
      destinationClassroomExplanation: 'This lesson will be copied to {classroomName}',
      lessonVisibilityQuestion: 'Who should this lesson be visible to in this class?',
      copyOfLesson: 'Copy of {lessonName}',
    },
  };

</script>


<style lang="stylus" scoped></style>
