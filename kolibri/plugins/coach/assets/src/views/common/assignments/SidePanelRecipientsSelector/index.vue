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
        v-if="learners.length > 0"
        ref="groupOrIndividualRadioButton"
        v-model="selectedRecipients"
        :buttonValue="ClassRecipients.GROUP_OR_INDIVIDUAL"
        :disabled="disabled"
      >
        <div :dir="isRtl ? 'rtl' : 'ltr'">
          <KLabeledIcon
            :label="coachString('groupsAndLearnersLabel')"
            icon="people"
          />
          <span v-if="hasGroupOrIndividualRecipients">
            {{ selectedMessage }}
          </span>
          <KButton
            v-if="selectedRecipients === ClassRecipients.GROUP_OR_INDIVIDUAL"
            appearance="basic-link"
            :text="hasGroupOrIndividualRecipients ? $tr('changeAction') : $tr('selectAction')"
            style="margin: 0 0.5em"
            @click="isLearnersSelectorOpen = true"
          />
        </div>
        <div
          v-if="assignmentInvalidText"
          :style="{
            color: $themeTokens.error,
          }"
        >
          {{ assignmentInvalidText }}
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
      @close="closeSidePanel"
      @update:adHocLearners="updateAdHocLearners"
    />
  </div>

</template>


<script>

  import { mapGetters } from 'vuex';
  import every from 'lodash/every';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import useKLiveRegion from 'kolibri-design-system/lib/composables/useKLiveRegion';
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
    setup() {
      const { sendAssertiveMessage } = useKLiveRegion();
      return { sendAssertiveMessage };
    },
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
        assignmentInvalidText: '',
      };
    },
    computed: {
      ...mapGetters('classSummary', ['getRecipientNamesForExam', 'learners']),
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
          // Backup data in case user selects group or individual again.
          this.selectedGroupsBackedUp = this.selectedGroupIds;
          this.adHocLearnersBackedUp = this.adHocLearners;

          this.selectedGroupIds = [this.classId];
          this.updateAdHocLearners([]);
        } else {
          if (this.adHocLearnersBackedUp) {
            this.updateAdHocLearners(this.adHocLearnersBackedUp);
          }
          if (this.selectedGroupsBackedUp) {
            this.selectedGroupIds = this.selectedGroupsBackedUp;
          } else {
            this.selectedGroupIds = this.selectedCollectionIds.filter(id => id !== this.classId);
          }
        }
      },
      selectedGroupIds(newVal) {
        this.$emit('update:selectedCollectionIds', newVal);
      },
    },
    created() {
      if (this.selectedCollectionIds.includes(this.classId)) {
        this.selectedRecipients = ClassRecipients.ENTIRE_CLASS;
      } else {
        this.selectedRecipients = ClassRecipients.GROUP_OR_INDIVIDUAL;
      }
    },
    methods: {
      updateAdHocLearners(newVal) {
        this.$emit('update:adHocLearners', newVal);
      },
      async closeSidePanel() {
        this.isLearnersSelectorOpen = false;
        await this.$nextTick();
        if (this.assignmentInvalidText) {
          this.validate();
        }
      },
      /**
       * Validates the selected recipients and sets the error message if invalid
       * @public
       */
      validate() {
        if (!this.hasRecipients) {
          this.assignmentInvalidText = this.$tr('noRecipientsSelected');
        } else {
          this.assignmentInvalidText = '';
        }
        return this.assignmentInvalidText;
      },
      /**
       * @public
       */
      async handleSubmitRecipientsFailure() {
        await this.$nextTick();
        if (!this.assignmentInvalidText) {
          return;
        }
        this.sendAssertiveMessage(this.assignmentInvalidText);
        this.$refs.groupOrIndividualRadioButton.focus();
        // Scroll to the radio button in case focus() didn't do that immediately
        window.scrollTo({ top: 0, behavior: 'smooth' });
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
      noRecipientsSelected: {
        message: 'Please select at least one group or learner',
        context: 'Error message when no recipients are selected',
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

  /deep/ .k-radio-button-label {
    text-align: left;
  }

  /deep/ .labeled-icon-wrapper {
    width: auto;
  }

</style>
