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
      <LearnersAndGroupsSelector
        :groups="groups"
        :adHocLearners.sync="workingAdHocLearners"
        :selectedGroupIds.sync="workingSelectedGroupIds"
        :disabled="disabled"
        :classId="classId"
      />
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

  import SidePanelModal from 'kolibri-common/components/SidePanelModal';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { coachStringsMixin } from '../../commonCoachStrings';
  import LearnersAndGroupsSelector from '../LearnersAndGroupsSelector.vue';

  export default {
    name: 'LearnersSelectorSidePanel',
    components: {
      SidePanelModal,
      LearnersAndGroupsSelector,
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
    methods: {
      focusFirstEl() {
        this.$nextTick(() => {
          this.$el.querySelector('input').focus();
        });
      },
      save() {
        this.$emit('update:adHocLearners', this.workingAdHocLearners);
        this.$emit('update:selectedGroupIds', this.workingSelectedGroupIds);
        this.$emit('close');
      },
    },
    $trs: {
      selectGroupsAndIndividualLearnersTitle: {
        message: 'Select groups and individual learners',
        context: 'Title for the side panel to select groups and individual learners',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .bottom-nav-container {
    display: flex;
    justify-content: flex-end;
    width: 100%;
  }

  .side-panel-title {
    font-size: 18px;
    font-weight: 600;
  }

</style>
