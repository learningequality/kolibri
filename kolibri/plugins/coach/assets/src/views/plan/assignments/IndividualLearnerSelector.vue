<template>

  <div>
    <KCheckbox
      key="individualLearners"
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
        :items="visibleLearners"
        :filterFunction="filterLearners"
        :filterPlaceholder="$tr('searchPlaceholder')"
        :itemsPerPage="itemsPerPage"
        @pageChanged="pageNum => currentPage = pageNum"
      >
        <template v-slot:default="{items, filterInput}">
          <div v-if="hiddenLearnerIds.length" class="hidden-learners-tooltip">
            {{ $tr('numHiddenLearnersLabel', { numLearners: hiddenLearnerIds.length }) }}
            <div ref="icon" style="display:inline;">
              <KIcon
                icon="error"
                :color="$themeTokens.primary"
                style="position:relative;"
              />
              <KTooltip
                reference="icon"
                :refs="$refs"
              >
                {{ $tr('hiddenGroupsTooltipLabel') }}
                {{ hiddenGroupNames.join(',') }}
              </KTooltip>
            </div>
          </div>
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
              <tr v-for="learner in items" :key="learner.id">
                <td>
                  <KCheckbox
                    :key="`select-learner-${learner.id}`"
                    :label="learner.name"
                    :checked="selectedIndividualIds.includes(learner.id)"
                    :disabled="disabled"
                    @change="toggleSelectedLearnerId(learner.id)"
                  />
                </td>
                <td> {{ learner.username }} </td>
                <td> {{ groupsForLearner(learner.id) }} </td>
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
  import commonCoachStrings from '../../common';
  import { userMatchesFilter, filterAndSortUsers } from '../../../userSearchUtils';

  const ITEMS_PER_PAGE = 5;

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
      initialIndividualLearners: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        isChecked: !!this.initialIndividualLearners.length,
        selectedIndividualIds: this.initialIndividualLearners,
        currentPage: 1,
      };
    },
    computed: {
      ...mapState('classSummary', ['groupMap']),
      visibleLearners() {
        return this.learners.filter(learner => !this.hiddenLearnerIds.includes(learner.id));
      },
      currentPageLearners() {
        const baseIndex = (this.currentPage - 1) * this.itemsPerPage;
        return this.visibleLearners.slice(baseIndex, baseIndex + this.itemsPerPage);
      },
      hiddenLearnerIds() {
        let hiddenLearnerIds = [];
        this.selectedGroupIds.forEach(groupId => {
          hiddenLearnerIds = hiddenLearnerIds.concat(this.groupMap[groupId].member_ids);
        });
        return uniq(hiddenLearnerIds);
      },
      hiddenGroupNames() {
        return this.selectedGroupIds.map(groupId => this.groupMap[groupId].name);
      },
      showAsChecked() {
        return this.entireClassIsSelected ? false : this.isChecked;
      },
      allOfCurrentPageIsSelected() {
        const selectedVisibleLearners = this.currentPageLearners.filter(visible => {
          return this.selectedIndividualIds.includes(visible.id);
        });
        return selectedVisibleLearners.length === this.currentPageLearners.length;
      },
      itemsPerPage() {
        return ITEMS_PER_PAGE;
      },
    },
    watch: {
      entireClassIsSelected() {
        if (this.entireClassIsSelected) {
          this.isChecked = false;
          this.$emit('toggleCheck', this.isChecked, this.$store.state.individualLearners.id);
        }
      },
      selectedIndividualIds() {
        this.$emit('updateLearners', this.selectedIndividualIds);
      },
    },
    methods: {
      toggleChecked() {
        this.isChecked = !this.isChecked;
        this.$emit('toggleCheck', this.isChecked, this.$store.state.individualLearners.id);
      },
      toggleSelectedLearnerId(learnerId) {
        const index = this.selectedIndividualIds.indexOf(learnerId);
        if (index === -1) {
          this.selectedIndividualIds.push(learnerId);
        } else {
          this.selectedIndividualIds.splice(index, 1);
        }
      },
      selectVisiblePage() {
        const isWholePageSelected = this.allOfCurrentPageIsSelected;
        this.currentPageLearners.forEach(learner => {
          const index = this.selectedIndividualIds.indexOf(learner.id);

          if (isWholePageSelected) {
            // Deselect all if we're going from all selected to none.
            this.selectedIndividualIds.splice(index, 1);
          } else {
            // Or add every one of them if it isn't there already
            if (index === -1) {
              this.selectedIndividualIds.push(learner.id);
            }
          }
        });
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
      numHiddenLearnersLabel: {
        message:
          '{ numLearners, number } { numLearners, plural, one {learner} other {learners} } hidden',
        context:
          'A label indicating the number of learners who are hidden due to being part of a group that is already selected.',
      },
      hiddenGroupsTooltipLabel: {
        message: 'Not showing learners selected from',
        context:
          'A label in a tooltip that explains which groups of learners are not being displayed in the table used to select individual learners.',
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
