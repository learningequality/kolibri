<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="$emit('close')"
  >
    <template #header>
      <h1>
        {{ $tr('selectGroupsAndIndividualLearnersTitle') }}
      </h1>
    </template>
    <div style="padding-top: 30px">
      <!-- TODO: remove this div once SidePanelModal is fixed-->
      <section>
        <h2>{{ coachString('groupsLabel') }}</h2>
        <KCheckbox
          v-for="group in groups"
          :key="group.id"
          :checked="groupIsSelected(group)"
          :disabled="disabled"
          @change="toggleGroup($event, group)"
        >
          <KLabeledIcon
            :label="group.name"
            icon="group"
          />
        </KCheckbox>
        <KCheckbox
          :label="$tr('allUngroupedLearnres')"
          :checked="allUngroupedLearnresIsSelected"
          :disabled="disabled"
          @change="selectAllUngroupedLearners($event)"
        />
      </section>
      <section>
        <h2>{{ coachString('individualLearnersLabel') }}</h2>
        <div>
          {{ coachString('onlyShowingEnrolledLabel') }}
        </div>
        <IndividualLearnerSelectorTable
          :selectedGroupIds="selectedGroupIds"
          :selectedLearnerIds="adHocLearners"
          :disabled="disabled"
          :targetClassId="classId"
          @update:selectedLearnerIds="updateAdHocLearners"
        />
      </section>
    </div>
  </SidePanelModal>

</template>


<script>

  import { mapGetters } from 'vuex';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import { coachStringsMixin } from '../../../common/commonCoachStrings';
  import IndividualLearnerSelectorTable from '../IndividualLearnerSelector/IndividualLearnerSelectorTable';

  export default {
    name: 'LearnersSelectorSidePanel',
    components: {
      SidePanelModal,
      IndividualLearnerSelectorTable,
    },
    mixins: [coachStringsMixin],
    props: {
      groups: {
        type: Array,
        required: true,
      },
      adHocLearners: {
        type: Array,
        required: false,
        default: () => [],
      },
      selectedGroupIds: {
        type: Array,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      classId: {
        type: String,
        required: true,
      },
    },
    computed: {
      ...mapGetters('classSummary', ['learners']),
      ungroupedLearnersIds() {
        return this.learners.filter(learner => !learner.group_id).map(learner => learner.id);
      },
      allUngroupedLearnresIsSelected() {
        return this.adHocLearners.length === this.ungroupedLearnersIds.length;
      },
    },
    methods: {
      groupIsSelected({ id }) {
        return this.selectedGroupIds.includes(id);
      },
      toggleGroup(isChecked, { id }) {
        if (isChecked) {
          this.$emit('update:selectedGroupIds', [...this.selectedGroupIds, id]);
        } else {
          this.$emit(
            'update:selectedGroupIds',
            this.selectedGroupIds.filter(groupId => groupId !== id),
          );
        }
      },
      updateAdHocLearners(learnerIds) {
        this.$emit('update:adHocLearners', learnerIds);
      },
      selectAllUngroupedLearners(isChecked) {
        if (isChecked) {
          this.updateAdHocLearners(this.ungroupedLearnersIds);
        } else {
          this.updateAdHocLearners([]);
        }
      },
    },
    $trs: {
      allUngroupedLearnres: {
        message: 'All Ungrouped Learners',
        context: 'Option to select all learners that are not in a group',
      },
      selectGroupsAndIndividualLearnersTitle: {
        message: 'Select groups and individual learners',
        context: 'Title for the side panel to select groups and individual learners',
      },
    },
  };

</script>
