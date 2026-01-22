<template>

  <div>
    <section>
      <h2 class="mt-0">
        {{ groupsLabel$() }}
      </h2>
      <KCheckbox
        v-for="group in sortedGroups"
        :key="group.id"
        v-model="workingSelectedGroupIds"
        :value="group.id"
      >
        <KLabeledIcon
          :label="group.name"
          icon="group"
          class="font-size-14"
        />
      </KCheckbox>
      <KCheckbox
        :checked="areAllUngroupedLearnersSelected"
        :disabled="isAllUngroupedLearnersDisabled"
        @change="selectAllUngroupedLearners($event)"
      >
        <KLabeledIcon
          :label="allUngroupedLearnersLabel$()"
          icon="people"
          class="font-size-14"
          :color="isAllUngroupedLearnersDisabled ? $themeTokens.textDisabled : null"
        />
      </KCheckbox>
    </section>
    <section>
      <h2>{{ individualLearnersLabel$() }}</h2>
      <div class="font-size-14">
        {{ onlyShowingEnrolledLabel$() }}
      </div>
      <IndividualLearnerSelectorTable
        searchFieldBlock
        :selectedGroupIds="workingSelectedGroupIds"
        :selectedLearnerIds.sync="workingAdHocLearners"
        :disabled="disabled"
        :targetClassId="classId"
        @update:selectedLearnerIds="workingAdHocLearners = $event"
      />
    </section>
  </div>

</template>


<script>

  import { computed } from 'vue';
  import uniq from 'lodash/uniq';
  import store from 'kolibri/store';

  import { coachStrings } from '../commonCoachStrings';
  import IndividualLearnerSelectorTable from './IndividualLearnerSelector/IndividualLearnerSelectorTable.vue';

  export default {
    name: 'LearnersAndGroupsSelector',
    components: { IndividualLearnerSelectorTable },
    setup(props, { emit }) {
      const workingAdHocLearners = computed({
        get: () => [...props.adHocLearners],
        set: value => emit('update:adHocLearners', value),
      });
      const workingSelectedGroupIds = computed({
        get: () => [...props.selectedGroupIds],
        set: value => emit('update:selectedGroupIds', value),
      });

      const groups = computed(() => {
        if (props.groups) {
          return props.groups;
        }
        return store.getters['classSummary/groups'];
      });
      const learners = computed(() => store.getters['classSummary/learners']);

      const sortedGroups = computed(() => {
        const groupsList = [...groups.value];
        return groupsList.sort((a, b) => a.name.localeCompare(b.name));
      });

      const ungroupedLearnersIds = computed(() => {
        return learners.value
          .filter(learner => {
            return groups.value.every(group => !group.member_ids.includes(learner.id));
          })
          .map(learner => learner.id);
      });

      const isAllUngroupedLearnersDisabled = computed(() => {
        return props.disabled || ungroupedLearnersIds.value.length === 0;
      });

      const areAllUngroupedLearnersSelected = computed(() => {
        if (ungroupedLearnersIds.value.length === 0) {
          return false;
        }
        return ungroupedLearnersIds.value.every(learnerId =>
          workingAdHocLearners.value.includes(learnerId),
        );
      });

      const selectAllUngroupedLearners = isChecked => {
        if (isChecked) {
          workingAdHocLearners.value = uniq([
            ...workingAdHocLearners.value,
            ...ungroupedLearnersIds.value,
          ]);
        } else {
          workingAdHocLearners.value = workingAdHocLearners.value.filter(
            learnerId => !ungroupedLearnersIds.value.includes(learnerId),
          );
        }
      };

      const {
        groupsLabel$,
        individualLearnersLabel$,
        onlyShowingEnrolledLabel$,
        allUngroupedLearnersLabel$,
      } = coachStrings;

      return {
        workingAdHocLearners,
        workingSelectedGroupIds,
        sortedGroups,
        isAllUngroupedLearnersDisabled,
        areAllUngroupedLearnersSelected,
        selectAllUngroupedLearners,
        groupsLabel$,
        individualLearnersLabel$,
        onlyShowingEnrolledLabel$,
        allUngroupedLearnersLabel$,
      };
    },
    props: {
      groups: {
        type: Array,
        required: false,
        default: null,
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
  };

</script>


<style lang="scss" scoped>

  .mt-0 {
    margin-top: 0;
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
