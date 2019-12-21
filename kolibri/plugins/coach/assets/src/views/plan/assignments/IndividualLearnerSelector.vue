<template>

  <div>
    <KCheckbox
      key="adHocLearners"
      :label="$tr('individualLearnersLabel')"
      :checked="showAsChecked"
      :disabled="disabled"
      @change="toggleChecked"
    />
    <div v-if="showAsChecked">
      <div class="table-title">
        {{ $tr("selectedIndividualLearnersLabel") }}
      </div>
      <div class="table-description">
        {{ $tr("onlyShowingEnrolledLabel") }}
      </div>

      <PaginatedListContainer
        :items="allLearners"
        :filterFunction="filterLearners"
        :filterPlaceholder="$tr('searchPlaceholder')"
        :itemsPerPage="itemsPerPage"
        @pageChanged="pageNum => currentPage = pageNum"
      >
        <template v-slot:default="{items, filterInput}">
          <CoreTable
            :selectable="true"
            :emptyMessage="$tr('noUsersMatch')"
          >
            <thead slot="thead">
              <tr>
                <th class="table-checkbox-header">
                  <KCheckbox
                    key="selectAllOnPage"
                    :label="$tr('selectAllLabel')"
                    :checked="allOfCurrentPageIsSelected"
                    :disabled="disabled"
                    @change="selectVisiblePage"
                  />
                </th>
                <th class="table-header">
                  {{ coreString('usernameLabel') }}
                </th>
                <th class="table-header">
                  {{ coachString('groupsLabel') }}
                </th>
              </tr>
            </thead>

            <tbody slot="tbody">
              <!-- Disable the line and check the box if the
                   learner is in a selected group -->
              <tr v-for="learner in items" :key="learner.id">
                <template v-if="learnerIsInSelectedGroup(learner.id)">
                  <td>
                    <KCheckbox
                      :key="`select-learner-${learner.id}`"
                      :label="learner.name"
                      :checked="true"
                      :disabled="true"
                    />
                  </td>
                  <td> {{ learner.username }} </td>
                  <td> {{ groupsForLearner(learner.id) }} </td>
                </template>
                <template v-else>
                  <td>
                    <KCheckbox
                      :key="`select-learner-${learner.id}`"
                      :label="learner.name"
                      :checked="selectedAdHocIds.includes(learner.id)"
                      :disabled="disabled"
                      @change="toggleSelectedLearnerId(learner.id)"
                    />
                  </td>
                  <td> {{ learner.username }} </td>
                  <td> {{ groupsForLearner(learner.id) }} </td>
                </template>
              </tr>
            </tbody>
          </CoreTable>
        </template>
      </PaginatedListContainer>
    </div>

  </div>

</template>


<script>

  import { mapState } from 'vuex';
  import CoreTable from 'kolibri.coreVue.components.CoreTable';
  import PaginatedListContainer from 'kolibri.coreVue.components.PaginatedListContainer';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import uniq from 'lodash/uniq';
  import ClassSummaryResource from '../../../apiResources/classSummary';
  import commonCoachStrings from '../../common';
  import { userMatchesFilter, filterAndSortUsers } from '../../../userSearchUtils';

  const DEFAULT_ITEMS_PER_PAGE = 50;
  const SHORT_ITEMS_PER_PAGE = 5;

  export default {
    name: 'IndividualLearnerSelector',
    components: { CoreTable, PaginatedListContainer },
    mixins: [commonCoreStrings, commonCoachStrings],
    props: {
      selectedGroupIds: {
        type: Array,
        required: true,
        default: new Array(),
      },
      entireClassIsSelected: {
        type: Boolean,
        required: true,
        default: false,
      },
      disabled: {
        type: Boolean,
        required: true,
        default: false,
      },
      initialAdHocLearners: {
        type: Array,
        required: true,
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
        isChecked: Boolean(this.initialAdHocLearners.length),
        selectedAdHocIds: this.initialAdHocLearners,
        currentPage: 1,
        searchText: '',
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
        return this.groupMapFromOtherClass ? this.groupMapFromOtherClass : this.groupMap;
      },
      currentPageLearners() {
        const baseIndex = (this.currentPage - 1) * this.itemsPerPage;
        return this.filterLearners(this.allLearners, this.searchText).slice(
          baseIndex,
          baseIndex + this.itemsPerPage
        );
      },
      hiddenLearnerIds() {
        let hiddenLearnerIds = [];
        this.selectedGroupIds.forEach(groupId => {
          hiddenLearnerIds = hiddenLearnerIds.concat(this.currentGroupMap[groupId].member_ids);
        });
        return uniq(hiddenLearnerIds);
      },
      showAsChecked() {
        return this.entireClassIsSelected ? false : this.isChecked;
      },
      allOfCurrentPageIsSelected() {
        const selectedVisibleLearners = this.currentPageLearners.filter(visible => {
          return this.selectedAdHocIds.includes(visible.id);
        });
        return selectedVisibleLearners.length === this.currentPageLearners.length;
      },
      itemsPerPage() {
        return this.targetClassId ? SHORT_ITEMS_PER_PAGE : DEFAULT_ITEMS_PER_PAGE;
      },
    },
    watch: {
      entireClassIsSelected() {
        if (this.entireClassIsSelected) {
          this.isChecked = false;
          this.currentPage = 1;
          this.$emit('toggleCheck', this.isChecked, this.$store.state.adHocLearners.id);
        }
      },
      selectedAdHocIds() {
        this.$emit('updateLearners', this.selectedAdHocIds);
      },
    },
    methods: {
      fetchOutsideClassroom() {
        this.fetchingOutside = true;
        ClassSummaryResource.fetchModel({ id: this.targetClassId, force: true }).then(summary => {
          let summaryGroupMap = {};
          summary.groups.forEach(group => {
            summaryGroupMap[group.id] = group;
          });
          this.groupMapFromOtherClass = summaryGroupMap;
          this.learnersFromOtherClass = summary.learners;
          this.fetchingOutside = false;
        });
      },
      toggleChecked() {
        this.isChecked = !this.isChecked;
        this.$emit('toggleCheck', this.isChecked, this.$store.state.adHocLearners.id);
      },
      toggleSelectedLearnerId(learnerId) {
        const index = this.selectedAdHocIds.indexOf(learnerId);
        if (index === -1) {
          this.selectedAdHocIds.push(learnerId);
        } else {
          this.selectedAdHocIds.splice(index, 1);
        }
      },
      selectVisiblePage() {
        const isWholePageSelected = this.allOfCurrentPageIsSelected;
        this.currentPageLearners.forEach(learner => {
          const index = this.selectedAdHocIds.indexOf(learner.id);

          if (isWholePageSelected) {
            // Deselect all if we're going from all selected to none.
            this.selectedAdHocIds.splice(index, 1);
          } else {
            // Or add every one of them if it isn't there already
            if (index === -1) {
              this.selectedAdHocIds.push(learner.id);
            }
          }
        });
      },
      learnerIsInSelectedGroup(learnerId) {
        return this.hiddenLearnerIds.includes(learnerId);
      },
      groupsForLearner(learnerId) {
        let learnerGroups = [];
        this.groups.forEach(group => {
          if (group.member_ids.includes(learnerId)) {
            learnerGroups.push(group.name);
          }
        });
        return learnerGroups.join(', ');
      },
      filterLearners(learners, searchText) {
        this.searchText = searchText;
        return filterAndSortUsers(learners, learner => {
          // userMatchesFilter calls on full_name property
          learner.full_name = learner.name;
          return userMatchesFilter(learner, searchText);
        });
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
          'A piece of text showing beneath selectedIndividualLearners explaining that the table only includes enrolled learners.',
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
      searchPlaceholder: 'Search for a user…',
      noUsersMatch: 'No users match',
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

  .filter-input {
    margin-top: 16px;
  }

</style>
