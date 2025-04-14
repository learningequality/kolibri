<template>

  <SidePanelModal
    alignment="right"
    sidePanelWidth="700px"
    closeButtonIconType="close"
    @closePanel="$emit('close')"
    @shouldFocusFirstEl="focusFirstEl"
  >
    <template #header>
      <h1 class="side-panel-title">
        {{ $tr('selectGroupsAndIndividualLearnersTitle') }}
      </h1>
    </template>
    <template #default>
      <section>
        <h2 class="mt-0">
          {{ coachString('groupsLabel') }}
        </h2>
        <KCheckbox
          v-for="group in sortedGroups"
          :key="group.id"
          :checked="groupIsSelected(group)"
          :disabled="disabled"
          @change="toggleGroup($event, group)"
        >
          <KLabeledIcon
            :label="group.name"
            icon="group"
            class="font-size-14"
          />
        </KCheckbox>
        <KCheckbox
          :checked="allUngroupedLearnresIsSelected"
          :disabled="isAllUngroupedLearnersDisabled"
          @change="selectAllUngroupedLearners($event)"
        >
          <KLabeledIcon
            :label="$tr('allUngroupedLearnres')"
            icon="people"
            class="font-size-14"
            :color="isAllUngroupedLearnersDisabled ? $themeTokens.textDisabled : null"
          />
        </KCheckbox>
      </section>
      <section>
        <h2>{{ coachString('individualLearnersLabel') }}</h2>
        <div class="font-size-14">
          {{ coachString('onlyShowingEnrolledLabel') }}
        </div>
        <IndividualLearnerSelectorTable
          searchFieldBlock
          :selectedGroupIds="workingSelectedGroupIds"
          :selectedLearnerIds.sync="workingAdHocLearners"
          :disabled="disabled"
          :targetClassId="classId"
          @update:selectedLearnerIds="updateAdHocLearners"
        />
      </section>
    </template>
    <template #bottomNavigation>
      <div class="bottom-nav-container">
        <KButton
          primary
          :text="coreString('saveAction')"
          @click="save"
        />
      </div>
    </template>
  </SidePanelModal>

</template>


<script>

  import uniq from 'lodash/uniq';
  import { mapGetters, mapState } from 'vuex';
  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { coachStringsMixin } from '../../../common/commonCoachStrings';
  import IndividualLearnerSelectorTable from '../IndividualLearnerSelector/IndividualLearnerSelectorTable';

  export default {
    name: 'LearnersSelectorSidePanel',
    components: {
      SidePanelModal,
      IndividualLearnerSelectorTable,
    },
    mixins: [coachStringsMixin, commonCoreStrings],
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
    data() {
      return {
        workingAdHocLearners: this.adHocLearners,
        workingSelectedGroupIds: this.selectedGroupIds,
      };
    },
    computed: {
      ...mapGetters('classSummary', ['learners']),
      ...mapState('classSummary', ['groupMap']),
      sortedGroups() {
        const groups = [...this.groups];
        return groups.sort((a, b) => a.name.localeCompare(b.name));
      },
      ungroupedLearnersIds() {
        return this.learners
          .filter(learner => {
            return Object.values(this.groupMap).every(
              group => !group.member_ids.includes(learner.id),
            );
          })
          .map(learner => learner.id);
      },
      isAllUngroupedLearnersDisabled() {
        return this.disabled || this.ungroupedLearnersIds.length === 0;
      },
      allUngroupedLearnresIsSelected() {
        if (this.ungroupedLearnersIds.length === 0) {
          return false;
        }
        return this.ungroupedLearnersIds.every(learnerId =>
          this.workingAdHocLearners.includes(learnerId),
        );
      },
    },
    methods: {
      focusFirstEl() {
        this.$nextTick(() => {
          this.$el.querySelector('input').focus();
        });
      },
      groupIsSelected({ id }) {
        return this.workingSelectedGroupIds.includes(id);
      },
      toggleGroup(isChecked, { id }) {
        if (isChecked) {
          this.workingSelectedGroupIds = [...this.workingSelectedGroupIds, id];
        } else {
          this.workingSelectedGroupIds = this.workingSelectedGroupIds.filter(
            groupId => groupId !== id,
          );
        }
      },
      updateAdHocLearners(learnerIds) {
        this.workingAdHocLearners = learnerIds;
      },
      selectAllUngroupedLearners(isChecked) {
        if (isChecked) {
          this.workingAdHocLearners = uniq([
            ...this.workingAdHocLearners,
            ...this.ungroupedLearnersIds,
          ]);
        } else {
          this.workingAdHocLearners = this.workingAdHocLearners.filter(
            learnerId => !this.ungroupedLearnersIds.includes(learnerId),
          );
        }
      },
      save() {
        this.$emit('update:adHocLearners', this.workingAdHocLearners);
        this.$emit('update:selectedGroupIds', this.workingSelectedGroupIds);
        this.$emit('close');
      },
    },
    $trs: {
      allUngroupedLearnres: {
        message: 'All ungrouped learners',
        context: 'Option to select all learners that are not in a group',
      },
      selectGroupsAndIndividualLearnersTitle: {
        message: 'Select groups and individual learners',
        context: 'Title for the side panel to select groups and individual learners',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .mt-0 {
    margin-top: 0;
  }

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

  .side-panel-title {
    font-size: 18px;
    font-weight: 600;
  }

  section h2 {
    margin-top: 24px;
    font-size: 16px;
    font-weight: 600;
  }

  .font-size-14 {
    font-size: 14px;
  }

</style>
