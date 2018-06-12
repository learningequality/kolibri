<template>

  <div>
    <!-- Classroom Selection Form -->
    <k-modal
      v-if="stage===Stages.SELECT_CLASSROOM"
      id="select-classroom"
      :title="modalTitle"
      :submitText="$tr('continue')"
      :cancelText="$tr('cancel')"
      @cancel="closeModal"
      @submit="goToAvailableGroups"
    >
      <p>{{ copyExplanation }}</p>
      <k-radio-button
        v-for="classroom in availableClassrooms"
        :key="classroom.id"
        :label="classroomLabel(classroom)"
        :value="classroom.id"
        v-model="selectedClassroomId"
      />
    </k-modal>

    <!-- Learner Group Selection Form -->
    <k-modal
      v-else
      id="select-learnergroup"
      :title="modalTitle"
      :submitText="$tr('makeCopy')"
      :cancelText="$tr('cancel')"
      @cancel="closeModal"
      @submit="$emit('copy', selectedClassroomId, selectedCollectionIds)"
    >
      <p>{{ $tr('destinationExplanation', { classroomName: selectedClassroomName }) }}</p>
      <p>{{ assignmentQuestion }}</p>
      <recipient-selector
        v-model="selectedCollectionIds"
        :groups="availableGroups"
        :classId="selectedClassroomId"
      />
    </k-modal>
  </div>

</template>


<script>

  import sortBy from 'lodash/sortBy';
  import find from 'lodash/find';
  import { error as logError } from 'kolibri.lib.logging';
  import kModal from 'kolibri.coreVue.components.kModal';
  import kRadioButton from 'kolibri.coreVue.components.kRadioButton';
  import { LearnerGroupResource } from 'kolibri.resources';
  import { handleApiError } from 'kolibri.coreVue.vuex.actions';
  import RecipientSelector from './RecipientSelector';

  const Stages = {
    SELECT_CLASSROOM: 'SELECT_CLASSROOM',
    SELECT_GROUPS: 'SELECT_GROUPS',
  };

  export default {
    name: 'assignmentCopyModal',
    components: {
      kModal,
      kRadioButton,
      RecipientSelector,
    },
    props: {
      modalTitle: {
        type: String,
        required: true,
      },
      copyExplanation: {
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
      getLearnerGroupsForClassroom(classroomId) {
        return LearnerGroupResource.getCollection({ parent: classroomId }).fetch();
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
          .catch(err => {
            this.handleApiError(err);
            logError(err);
            this.blockControls = false;
          });
      },
      classroomLabel(classroom) {
        if (this.isCurrentClassroom(classroom)) {
          return this.$tr('currentClass', { name: classroom.name });
        }
        return classroom.name;
      },
      closeModal() {
        return this.$emit('cancel');
      },
      isCurrentClassroom(classroom) {
        return classroom.id === this.classId;
      },
    },
    vuex: {
      actions: {
        handleApiError,
      },
    },
    $trs: {
      currentClass: '{ name } (current class)',
      continue: 'Continue',
      cancel: 'Cancel',
      makeCopy: 'Copy',
      destinationExplanation: `Will be copied to '{classroomName}'`,
    },
  };

</script>


<style lang="stylus" scoped></style>
