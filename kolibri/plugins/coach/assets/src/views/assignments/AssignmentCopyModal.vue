<template>

  <core-modal
    :title="modalTitle"
    @cancel="closeModal()"
  >
    <!-- Classroom Selection Form -->
    <div v-if="stage===Stages.SELECT_CLASSROOM">
      <p>{{ copyExplanation }}</p>
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
      <p>{{ $tr('destinationExplanation', { classroomName: selectedClassroomName }) }}</p>
      <p>{{ assignmentQuestion }}</p>
      <form @submit.prevent="$emit('copy', selectedClassroomId, selectedCollectionIds)">
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
      coreModal,
      kButton,
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
