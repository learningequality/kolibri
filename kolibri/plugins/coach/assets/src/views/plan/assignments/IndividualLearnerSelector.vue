<template>

  <div>
    <KCheckbox
      key="individualLearners"
      :label="$tr('individualLearnersLabel')"
      :checked="showUserTable"
      :disabled="false"
      @change="showUserTable = !showUserTable"
    />
    <div v-if="showUserTable">
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
      >
        <template v-slot:default="{items, filterInput}">
          <CoreTable
            :selectable="true"
            :emptyMessage="$tr('noUsersMatch')"
          >
            <thead slot="thead">
              <tr>
                <th>
                  <KCheckbox
                    key="selectAllOnPage"
                    :label="$tr('selectAllLabel')"
                    :checked="selectAllOnPage"
                    :disabled="false"
                    @change="selectVisiblePage"
                  />
                </th>
                <th>
                  {{ coreString('usernameLabel') }}
                </th>
                <th>
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
                    :disabled="false"
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
  import commonCoachStrings from '../../common';
  import {
    userMatchesFilter,
    filterAndSortUsers,
  } from '../../../../../../device/assets/src/userSearchUtils';

  export default {
    name: 'IndividualLearnerSelector',
    components: { CoreTable, PaginatedListContainer },
    mixins: [commonCoreStrings, commonCoachStrings],
    props: {
      selectedGroupIds: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        showUserTable: false,
        selectedIndividualIds: [],
        selectAllOnPage: false,
      };
    },
    computed: {
      ...mapState('classSummary', ['groupMap', 'individualLearnersMap']),
      visibleLearners() {
        return this.learners.filter(learner => !this.hiddenLearnerIds.includes(learner.id));
      },
      hiddenLearnerIds() {
        let hiddenLearnerIds = [];
        this.selectedGroupIds.forEach(groupId => {
          hiddenLearnerIds.concat(this.groupMap[groupId].member_ids);
        });
        return hiddenLearnerIds;
      },
    },
    mounted() {
      /* Since IndividualLearners is a new model and existing quizzes may not have
       * the record created associated to this quiz, we will create one for the quiz
       * if we don't already have one.
       */
      const learnerIds = Object.keys(this.individualLearnersMap);
      if (learnerIds.length === 0) {
        this.$store.dispatch('individualLearners/createIndividualLearnersGroup', {
          classId: this.$route.params.classId,
        });
        this.$store.dispatch('classSummary/refreshClassSummary');
      } else {
        this.selectedIndividualIds = learnerIds;
      }
    },
    methods: {
      toggleSelectedLearnerId(learnerId) {
        const index = this.selectedIndividualIds.indexOf(learnerId);
        if (index === -1) {
          this.selectedIndividualIds.push(learnerId);
        } else {
          this.selectedIndividualIds.splice(index, 1);
        }
      },
      selectVisiblePage(learners) {
        this.selectAllOnPage = !this.selectAllOnPage;

        learners.forEach(learner => {
          const index = this.selectedIndividualIds.indexOf(learner.id);

          // If index doesn't exist but we want to select all
          if (index === -1 && this.selectAllOnPage) {
            this.selectedIndividualIds.push(learner.id);
          }
          // If index does exist and we want to deselect all
          if (index !== -1 && !this.selectAllOnPage) {
            this.selectedIndividualIds.splice(index, 1);
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
        return filterAndSortUsers(learners, learner => userMatchesFilter(learner, searchText));
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

  .table-description {
    margin-bottom: 8px;
    font-size: 16px;
  }

  .filter-input {
    margin-top: 16px;
  }

</style>
