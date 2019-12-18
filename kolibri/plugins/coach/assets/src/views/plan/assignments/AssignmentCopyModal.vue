<template>

  <KModal
    :title="modalTitle"
    v-bind="modalTexts"
    @submit="handleSubmit"
    @cancel="$emit('cancel')"
  >
    <!-- Classroom Selection Form -->
    <div v-if="stage=== Stages.SELECT_CLASSROOM" id="select-classroom">
      <KRadioButton
        v-for="classroom in availableClassrooms"
        :key="classroom.id"
        v-model="selectedClassroomId"
        :label="classroomLabel(classroom)"
        :value="classroom.id"
      />
    </div>
    <!-- Learner Group Selection Form -->
    <div v-else id="select-learnergroup">
      <p>{{ $tr('destinationExplanation', { classroomName: selectedClassroomName }) }}</p>
      <p>{{ assignmentQuestion }}</p>
      <RecipientSelector
        v-model="selectedCollectionIds"
        :groups="availableGroups"
        :classId="selectedClassroomId"
        :initialAdHocLearners="[]"
        @updateLearners="learners => adHocLearners = learners"
      />
    </div>
  </KModal>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import find from 'lodash/find';
  import { error as logError } from 'kolibri.lib.logging';
  import { LearnerGroupResource } from 'kolibri.resources';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { coachStringsMixin } from '../../common/commonCoachStrings';
  import RecipientSelector from './RecipientSelector';

  const Stages = {
    SELECT_CLASSROOM: 'SELECT_CLASSROOM',
    SELECT_GROUPS: 'SELECT_GROUPS',
  };

  export default {
    name: 'AssignmentCopyModal',
    components: {
      RecipientSelector,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      modalTitle: {
        type: String,
        required: true,
      },
      assignmentQuestion: {
        type: String,
        required: true,
      },
      classId: {
        type: String,
        required: true,
      },
      classList: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        Stages,
        availableGroups: [],
        blockControls: false,
        selectedClassroomId: null,
        selectedCollectionIds: [],
        stage: Stages.SELECT_CLASSROOM,
        adHocLearners: [],
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
      modalTexts() {
        if (this.stage === this.Stages.SELECT_CLASSROOM) {
          return {
            submitText: this.coreString('continueAction'),
            cancelText: this.coreString('cancelAction'),
          };
        }
        return {
          submitText: this.coachString('copyAction'),
          cancelText: this.coreString('cancelAction'),
        };
      },
    },
    created() {
      this.selectedClassroomId = this.classId;
    },
    methods: {
      getLearnerGroupsForClassroom(classroomId) {
        return LearnerGroupResource.fetchCollection({ getParams: { parent: classroomId } });
      },
      handleSubmit() {
        if (this.stage === this.Stages.SELECT_CLASSROOM) {
          this.goToAvailableGroups();
        } else {
          this.$emit(
            'submit',
            this.selectedClassroomId,
            this.selectedCollectionIds,
            this.adHocLearners
          );
        }
      },
      goToAvailableGroups() {
        // Do nothing if user presses Continue more than once
        if (this.blockControls) {
          return;
        }
        this.blockControls = true;
        // Select Entire Classroom by default
        this.selectedCollectionIds = [this.selectedClassroomId];
        return this.getLearnerGroupsForClassroom(this.selectedClassroomId)
          .then(groups => {
            this.availableGroups = groups;
            this.stage = Stages.SELECT_GROUPS;
            this.blockControls = false;
          })
          .catch(error => {
            this.$store.dispatch('handleApiError', error);
            logError(error);
            this.blockControls = false;
          });
      },
      classroomLabel(classroom) {
        if (this.isCurrentClassroom(classroom)) {
          return this.$tr('currentClass', { name: classroom.name });
        }
        return classroom.name;
      },
      isCurrentClassroom(classroom) {
        return classroom.id === this.classId;
      },
    },
    $trs: {
      currentClass: '{ name } (current class)',
      destinationExplanation: `Will be copied to '{classroomName}'`,
    },
  };

</script>


<style lang="scss" scoped></style>
