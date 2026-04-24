<template>

  <div class="selector-wrapper">
    <section v-if="showSelectClassOption">
      <h2>
        {{ classLabel$() }}
      </h2>
      <KRadioButton
        :currentValue="isClassSelected"
        :buttonValue="SELECT_CLASS_OPTION"
        :disabled="disabled"
        @change="selectEntireClass"
        @keydown.space.prevent="selectEntireClass"
      >
        <KLabeledIcon
          :label="entireClassLabel$()"
          icon="classes"
        />
      </KRadioButton>
    </section>
    <section>
      <h2>
        {{ groupsLabel$() }}
      </h2>
      <KCheckbox
        v-for="group in sortedGroups"
        :key="group.id"
        v-model="workingSelectedGroupIds"
        :disabled="disabled"
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
          :label="allUngroupedLearnres$()"
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
  import { localeCompare } from 'kolibri/utils/i18n';

  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { coachStrings } from '../commonCoachStrings';
  import IndividualLearnerSelectorTable from './IndividualLearnerSelector/IndividualLearnerSelectorTable.vue';

  const SELECT_CLASS_OPTION = 'select_class_option';

  export default {
    name: 'LearnersAndGroupsSelector',
    components: { IndividualLearnerSelectorTable },
    setup(props, { emit }) {
      const workingAdHocLearners = computed({
        get: () => [...props.adHocLearners],
        set: value => {
          emit('update:adHocLearners', value);
          if (workingSelectedGroupIds.value.includes(props.classId)) {
            workingSelectedGroupIds.value = workingSelectedGroupIds.value.filter(
              id => id !== props.classId,
            );
          }
        },
      });
      const workingSelectedGroupIds = computed({
        get: () => [...props.selectedGroupIds],
        set: value => {
          if (value.includes(props.classId) && value.length > 1) {
            value = value.filter(id => id !== props.classId);
          }
          emit('update:selectedGroupIds', value);
        },
      });

      const isClassSelected = computed(() => {
        if (!props.showSelectClassOption) {
          return '';
        }
        if (workingSelectedGroupIds.value.find(group => group === props.classId)) {
          return SELECT_CLASS_OPTION;
        }
        return '';
      });

      const selectEntireClass = () => {
        workingSelectedGroupIds.value = [props.classId];
        workingAdHocLearners.value = [];
      };

      const groups = computed(() => {
        if (props.groups) {
          return props.groups;
        }
        return store.getters['classSummary/groups'];
      });
      const learners = computed(() => store.getters['classSummary/learners']);

      const sortedGroups = computed(() => {
        const groupsList = [...groups.value];
        return groupsList.sort((a, b) => localeCompare(a.name, b.name));
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
        entireClassLabel$,
        individualLearnersLabel$,
        onlyShowingEnrolledLabel$,
        allUngroupedLearnres$,
      } = coachStrings;

      const { classLabel$ } = coreStrings;

      return {
        SELECT_CLASS_OPTION,
        isClassSelected,
        workingAdHocLearners,
        workingSelectedGroupIds,
        sortedGroups,
        isAllUngroupedLearnersDisabled,
        areAllUngroupedLearnersSelected,

        selectAllUngroupedLearners,
        selectEntireClass,

        classLabel$,
        groupsLabel$,
        entireClassLabel$,
        individualLearnersLabel$,
        onlyShowingEnrolledLabel$,
        allUngroupedLearnres$,
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
      showSelectClassOption: {
        type: Boolean,
        default: false,
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selector-wrapper {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  section h2 {
    margin-top: 0;
    font-size: 16px;
    font-weight: 600;
  }

  .font-size-14 {
    font-size: 14px;
  }

</style>
