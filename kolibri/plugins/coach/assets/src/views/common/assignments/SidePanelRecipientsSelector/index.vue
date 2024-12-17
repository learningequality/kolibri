<template>

  <div>
    <!-- Entire class -->
    <KRadioButtonGroup>
      <KRadioButton
        v-model="selectedRecipients"
        :buttonValue="ClassRecipients.ENTIRE_CLASS"
        :disabled="disabled"
      >
        <KLabeledIcon
          :label="coachString('entireClassLabel')"
          icon="classes"
        />
      </KRadioButton>
      <KRadioButton
        v-model="selectedRecipients"
        :buttonValue="ClassRecipients.GROUP_OR_INDIVIDUAL"
        :disabled="disabled"
      >
        <div
          :style="{
            display: 'flex',
            columnGap: '8px',
            flexDirection: hasGroupOrIndividualRecipients ? 'column' : 'row',
            alignItems: hasGroupOrIndividualRecipients ? 'flex-start' : 'center',
          }"
        >
          <KLabeledIcon
            :label="coachString('groupsAndLearnersLabel')"
            icon="people"
            style="width: auto"
          />
          <span v-if="hasGroupOrIndividualRecipients">
            {{ selectedMessage }}
          </span>
          <KButton
            v-if="selectedRecipients === ClassRecipients.GROUP_OR_INDIVIDUAL"
            appearance="basic-link"
            :text="hasGroupOrIndividualRecipients ? $tr('changeAction') : $tr('selectAction')"
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

  import { mapGetters } from 'vuex';
  import every from 'lodash/every';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { coachStringsMixin, getTruncatedItemsString } from '../../../common/commonCoachStrings';
  import LearnersSelectorSidePanel from './LearnersSelectorSidePanel';

  const ClassRecipients = {
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
        ClassRecipients,
        selectedRecipients: null,
        // Determines whether the group's checkbox is checked and affects which
        // learners are selectable in IndividualLearnerSelector
        selectedGroupIds: this.selectedCollectionIds.filter(id => id !== this.classId),
        isLearnersSelectorOpen: false,
      };
    },
    computed: {
      ...mapGetters('classSummary', ['getRecipientNamesForExam']),
      hasGroupOrIndividualRecipients() {
        return (
          this.selectedRecipients === ClassRecipients.GROUP_OR_INDIVIDUAL &&
          (this.selectedGroupIds.length > 0 || this.adHocLearners.length > 0)
        );
      },
      hasRecipients() {
        if (this.selectedRecipients === ClassRecipients.ENTIRE_CLASS) {
          return true;
        }
        return this.hasGroupOrIndividualRecipients;
      },
      selectedMessage() {
        if (!this.hasGroupOrIndividualRecipients) {
          return '';
        }
        const recipientsNames = this.getRecipientNamesForExam({
          learner_ids: this.adHocLearners,
          assignments: this.selectedGroupIds,
        });
        const truncatedItemsString = getTruncatedItemsString(recipientsNames);
        return this.$tr('selectedLabel', { selected: truncatedItemsString });
      },
    },
    watch: {
      selectedRecipients(newVal) {
        if (newVal === ClassRecipients.ENTIRE_CLASS) {
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
      this.selectedRecipients = ClassRecipients.ENTIRE_CLASS;
    },
    methods: {
      updateAdHocLearners(newVal) {
        this.$emit('update:adHocLearners', newVal);
      },
    },
    $trs: {
      selectedLabel: {
        message: 'Selected: {selected}',
        context: 'Label to show selected items',
      },
      selectAction: {
        message: 'Select',
        context: 'Button to select groups and learners',
      },
      changeAction: {
        message: 'Change',
        context: 'Button to change selected groups and learners',
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
