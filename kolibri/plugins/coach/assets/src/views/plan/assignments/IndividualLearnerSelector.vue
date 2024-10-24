<template>

  <div>
    <!-- Main checkbox -->
    <KCheckbox
      key="adHocLearners"
      :checked="isVisible"
      :disabled="disabled"
      @change="$emit('togglevisibility', $event)"
    >
      <KLabeledIcon
        icon="people"
        :label="$tr('individualLearnersLabel')"
      />
    </KCheckbox>

    <!-- Paginated list of learners -->
    <div v-if="isVisible">
      <div class="table-title">
        {{ $tr('selectedIndividualLearnersLabel') }}
      </div>
      <div class="table-description">
        {{ $tr('onlyShowingEnrolledLabel') }}
      </div>

      <PaginatedListContainer
        :items="allLearners"
        :filterPlaceholder="$tr('searchPlaceholder')"
        :itemsPerPage="itemsPerPage"
        @pageChanged="currentPageLearners = $event.items"
      >
        <template #default="{ items }">
          <CoreTable
            :selectable="true"
            :emptyMessage="noLearnersEnrolled$({ className: className })"
          >
            <template #headers>
              <th class="table-checkbox-header">
                <KCheckbox
                  key="selectAllOnPage"
                  :label="$tr('selectAllLabel')"
                  :checked="selectAllCheckboxProps.checked"
                  :indeterminate="selectAllCheckboxProps.indeterminate"
                  :disabled="selectAllCheckboxProps.disabled"
                  @change="selectVisiblePage"
                />
              </th>
              <th class="table-header">
                {{ coreString('usernameLabel') }}
              </th>
              <th class="table-header">
                {{ coachString('groupsLabel') }}
              </th>
            </template>

            <template #tbody>
              <tbody>
                <tr
                  v-for="learner in items"
                  :key="learner.id"
                >
                  <td>
                    <KCheckbox
                      :key="`select-learner-${learner.id}`"
                      :label="learner.name"
                      :checked="learnerIsSelected(learner)"
                      :disabled="learnerIsNotSelectable(learner)"
                      @change="toggleLearner($event, learner)"
                    />
                  </td>
                  <td class="table-data">
                    {{ learner.username }}
                  </td>
                  <td class="table-data">
                    {{ groupNamesForLearner(learner) }}
                  </td>
                </tr>
              </tbody>
            </template>
          </CoreTable>
        </template>
      </PaginatedListContainer>
    </div>
  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import { formatList } from 'kolibri.utils.i18n';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import { enhancedQuizManagementStrings } from 'kolibri-common/strings/enhancedQuizManagementStrings';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import flatMap from 'lodash/flatMap';
  import forEach from 'lodash/forEach';
  import countBy from 'lodash/countBy';
  import every from 'lodash/every';
  import ClassSummaryResource from '../../../apiResources/classSummary';
  import commonCoachStrings from '../../common';

  const DEFAULT_ITEMS_PER_PAGE = 30;

  export default {
    name: 'IndividualLearnerSelector',
    components: { CoreTable, PaginatedListContainer },
    mixins: [commonCoreStrings, commonCoachStrings],
    setup() {
      const { noLearnersEnrolled$ } = enhancedQuizManagementStrings;

      return {
        noLearnersEnrolled$,
      };
    },
    props: {
      // If true, the main checkbox is checked and the list of learners is shown
      isVisible: {
        type: Boolean,
        required: true,
      },
      // Used to disable learner rows if already assigned via learner group
      selectedGroupIds: {
        type: Array,
        required: true,
      },
      // List of selected learner IDs (must be .sync'd with parent form)
      selectedLearnerIds: {
        type: Array,
        required: true,
      },
      // Disables the entire form
      disabled: {
        type: Boolean,
        required: true,
        default: false,
      },
      // Only given when not used in current class context
      targetClassId: {
        type: String,
        required: false,
        default: null,
      },
    },
    data() {
      return {
        currentPageLearners: [],
        fetchingOutside: false,
        learnersFromOtherClass: null,
        groupMapFromOtherClass: null,
      };
    },
    computed: {
      ...mapState('classSummary', ['groupMap']),
      allLearners() {
        // If we get a class ID different that that in Vuex state,
        // then we're going to need to fetch that class's learners
        if (this.targetClassId != this.classId) {
          // This is init to null so we've not fetched it yet.
          if (!this.learnersFromOtherClass) {
            // Avoid refetching
            if (this.fetchingOutside) {
              return [];
            }
            // Fetch it and return empty for now...
            this.fetchOutsideClassroom();
            return [];
          } else {
            return this.learnersFromOtherClass;
          }
        } else {
          // Falls into the default vuex state.
          return this.learners;
        }
      },
      currentGroupMap() {
        return this.groupMapFromOtherClass || this.groupMap;
      },
      learnerIdsFromSelectedGroups() {
        // If a learner is part of a Learner Group that has already been selected
        // in RecipientSelector, then disable their row
        return flatMap(this.selectedGroupIds, groupId => this.currentGroupMap[groupId].member_ids);
      },
      selectAllCheckboxProps() {
        const currentCount = this.currentPageLearners.length;
        const counts = countBy(this.currentPageLearners, learner => {
          if (this.learnerIsInSelectedGroup(learner.id)) {
            return 'disabled';
          } else if (this.selectedLearnerIds.includes(learner.id)) {
            return 'checked';
          } else {
            return 'unchecked';
          }
        });
        const disabled = currentCount === counts.disabled || currentCount === 0;
        const checked = currentCount !== 0 && !counts.unchecked;

        return {
          disabled,
          checked,
          indeterminate: !checked && !disabled && counts.checked < currentCount,
        };
      },
      itemsPerPage() {
        return DEFAULT_ITEMS_PER_PAGE;
      },
    },
    methods: {
      fetchOutsideClassroom() {
        this.fetchingOutside = true;
        ClassSummaryResource.fetchModel({ id: this.targetClassId, force: true }).then(summary => {
          const summaryGroupMap = {};
          summary.groups.forEach(group => {
            summaryGroupMap[group.id] = group;
          });
          this.groupMapFromOtherClass = summaryGroupMap;
          this.learnersFromOtherClass = summary.learners;
          this.fetchingOutside = false;
        });
      },
      // Event handlers
      toggleLearner(checked, { id }) {
        let newLearnerIds = [...this.selectedLearnerIds];
        if (checked) {
          newLearnerIds.push(id);
        } else {
          newLearnerIds = newLearnerIds.filter(learnerId => learnerId !== id);
        }
        this.$emit('update:selectedLearnerIds', newLearnerIds);
      },
      selectVisiblePage() {
        const newIds = [...this.selectedLearnerIds];
        const isWholePageSelected = every(this.currentPageLearners, learner =>
          this.selectedLearnerIds.includes(learner.id),
        );
        this.currentPageLearners.forEach(learner => {
          const index = newIds.indexOf(learner.id);

          if (isWholePageSelected) {
            // Deselect all if we're going from all selected to none.
            newIds.splice(index, 1);
          } else {
            // Or add every one of them if it isn't there already
            if (index === -1) {
              newIds.push(learner.id);
            }
          }
          this.$emit('update:selectedLearnerIds', newIds);
        });
      },
      // Utilities for table
      learnerIsInSelectedGroup(learnerId) {
        return this.learnerIdsFromSelectedGroups.includes(learnerId);
      },
      learnerIsSelected({ id }) {
        return this.learnerIsInSelectedGroup(id) || this.selectedLearnerIds.includes(id);
      },
      learnerIsNotSelectable({ id }) {
        // If learner is unselectable if already part of a selected group or
        // if the whole form is disabled,
        return this.learnerIsInSelectedGroup(id) || this.disabled;
      },
      groupNamesForLearner({ id }) {
        const groupNames = [];
        forEach(this.currentGroupMap, group => {
          if (group.member_ids.includes(id)) {
            groupNames.push(group.name);
          }
        });
        return formatList(groupNames);
      },
    },
    $trs: {
      selectedIndividualLearnersLabel: {
        message: 'Select individual learners',
        context:
          'A bolded header for the table where a Coach will select individual learners who will have access to a quiz.',
      },
      onlyShowingEnrolledLabel: {
        message: 'Only showing learners that are enrolled in this class',
        context:
          "Shows beneath 'Select individual learners' explaining that the table only includes enrolled learners.",
      },
      selectAllLabel: {
        message: 'Select all on page',
        context: 'A checkbox label that will select all visible rows in the table',
      },
      individualLearnersLabel: {
        message: 'Individual learners',
        context:
          'A label for a checkbox that allows the Coach to assign the quiz to individual learners who may not be in a selected group.',
      },
      searchPlaceholder: {
        message: 'Search for a user…',
        context: 'Indicates the search function which allows admins to import users.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  fieldset {
    padding: 0;
    margin: 24px 0;
    border: 0;
  }

  .table-title {
    margin: 16px 0;
    font-size: 16px;
    font-weight: bold;
  }

  .table-header {
    padding: 24px 0;
  }

  .table-checkbox-header {
    padding: 8px;
  }

  .hidden-learners-tooltip {
    padding: 0 8px;
  }

  .table-description {
    margin-bottom: 8px;
    font-size: 16px;
  }

  .table-data {
    padding-top: 6px;
    vertical-align: middle;
  }

  .filter-input {
    margin-top: 16px;
  }

</style>
