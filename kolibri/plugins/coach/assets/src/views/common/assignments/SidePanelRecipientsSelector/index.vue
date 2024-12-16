<template>

  <div>
    <!-- Entire class -->
    <KRadioButtonGroup>
      <KRadioButton
        v-model="selectedRecipients"
        :buttonValue="Recipients.ENTIRE_CLASS"
        :disabled="disabled"
      >
        <KLabeledIcon
          :label="coachString('entireClassLabel')"
          icon="classes"
        />
      </KRadioButton>
      <KRadioButton
        v-model="selectedRecipients"
        :buttonValue="Recipients.GROUP_OR_INDIVIDUAL"
        :disabled="disabled"
      >
        <div class="flex-center">
          <KLabeledIcon
            :label="coachString('groupsAndLearnersLabel')"
            icon="people"
            style="width: auto"
          />
          <KButton
            v-if="selectedRecipients === Recipients.GROUP_OR_INDIVIDUAL"
            appearance="basic-link"
            :text="coreString('selectAction')"
            @click="isLearnersSelectorOpen = true"
          />
        </div>
      </KRadioButton>
    </KRadioButtonGroup>

    <LearnersSelectorSidePanel
      v-if="isLearnersSelectorOpen"
      :groups="groups"
      :adHocLearners="adHocLearners"
      :selectedGroupIds.sync="selectedGroupIds"
      :disabled="disabled"
      :classId="classId"
      @close="isLearnersSelectorOpen = false"
      @update:adHocLearners="updateAdHocLearners"
    />
  </div>

</template>


<script>

  import every from 'lodash/every';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { coachStringsMixin } from '../../../common/commonCoachStrings';
  import LearnersSelectorSidePanel from './LearnersSelectorSidePanel';

  const Recipients = {
    ENTIRE_CLASS: 'entire_class',
    GROUP_OR_INDIVIDUAL: 'group_or_individual',
  };

  export default {
    name: 'SidePanelRecipientsSelector',
    components: { LearnersSelectorSidePanel },
    mixins: [coachStringsMixin, commonCoreStrings],
    props: {
      // Needs to equal [classId] if entire class is selected
      // Otherwise, [groupId_1, groupId_2] for individual Learner Groups
      selectedCollectionIds: {
        type: Array,
        required: true,
      },
      // Array of objects, each with (group) 'id' and 'name'
      groups: {
        type: Array,
        required: true,
        validator(value) {
          return every(value, val => val.name && val.id);
        },
      },
      // For the 'Entire Class' option
      classId: {
        type: String,
        required: true,
      },
      disabled: {
        type: Boolean,
        default: false,
      },
      adHocLearners: {
        type: Array,
        required: false,
        default: () => [],
      },
    },
    data() {
      return {
        Recipients,
        selectedRecipients: null,
        // Determines whether the group's checkbox is checked and affects which
        // learners are selectable in IndividualLearnerSelector
        selectedGroupIds: this.selectedCollectionIds.filter(id => id !== this.classId),
        isLearnersSelectorOpen: false,
      };
    },
    watch: {
      selectedRecipients(newVal) {
        if (newVal === Recipients.ENTIRE_CLASS) {
          this.selectedGroupIds = [this.classId];
          this.updateAdHocLearners([]);
        } else {
          this.selectedGroupIds = this.selectedCollectionIds.filter(id => id !== this.classId);
        }
      },
      selectedGroupIds(newVal) {
        this.$emit('update:selectedCollectionIds', newVal);
      },
    },
    mounted() {
      this.selectedRecipients = Recipients.ENTIRE_CLASS;
    },
    methods: {
      updateAdHocLearners(newVal) {
        this.$emit('update:adHocLearners', newVal);
      },
    },
  };

</script>


<style lang="scss" scoped>

  .flex-center {
    display: flex;
    gap: 8px;
    align-items: center;
  }

</style>
