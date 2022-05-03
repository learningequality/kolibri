<template>

  <SidePanelModal
    class="full-screen-side-panel"
    alignment="left"
    :fullScreenSidePanelCloseButton="true"
    sidePanelOverrideWidth="300px"
    @closePanel="$emit('close')"
    @shouldFocusFirstEl="findFirstEl()"
  >
    <KIconButton
      v-if="windowIsSmall && currentCategory"
      icon="back"
      :ariaLabel="coreString('back')"
      :color="$themeTokens.text"
      :tooltip="coreString('back')"
      @click="$emit('closeCategoryModal')"
    />
    <SearchFiltersPanel
      v-if="!currentCategory"
      ref="embeddedPanel"
      topicPage="True"
      width="100%"
      :value="value"
      :topicsListDisplayed="!mobileSearchActive"
      :topics="topics"
      :topicsLoading="topicsLoading"
      :more="topicMore"
      :genContentLink="genContentLink"
      :availableLabels="availableLabels"
      :activeActivityButtons="activeActivityButtons"
      :activeCategories="activeCategories"
      :showChannels="false"
      position="overlay"
      @input="val => $emit('searchTerms', val)"
      @currentCategory="$emit('currentCategory', $event)"
      @loadMoreTopics="$emit('loadMoreTopics')"
    />
  </SidePanelModal>

</template>


<script>

  import SidePanelModal from 'kolibri.coreVue.components.SidePanelModal';
  import genContentLink from '../../utils/genContentLink';
  import SearchFiltersPanel from '../SearchFiltersPanel';

  export default {
    name: 'SearchPanelModal',
    components: { SearchFiltersPanel, SidePanelModal },
    props: {
      value: {
        type: Object,
        required: true,
        validator(value) {
          const inputKeys = [
            'learning_activities',
            'learner_needs',
            'channels',
            'accessibility_labels',
            'languages',
            'grade_levels',
          ];
          return inputKeys.every(k => Object.prototype.hasOwnProperty.call(value, k));
        },
      },
      activeActivityButtons: {
        type: Object,
        required: false,
        default: null,
      },
      activeCategories: {
        type: Object,
        required: false,
        default: null,
      },
      availableLabels: {
        type: Object,
        required: false,
        default: null,
      },
      mobileSearchActive: {
        type: Boolean,
        required: false,
        default: false,
      },
      topicMore: {
        type: Function,
        default: () => null,
      },
      topics: {
        type: Array,
        default() {
          return [];
        },
      },
      topicsLoading: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        currentCategory: null,
        windowIsSmall: false,
      };
    },
    methods: {
      genContentLink,
      findFirstEl() {
        if (this.$refs.embeddedPanel) {
          this.$refs.embeddedPanel.focusFirstEl();
        }
      },
    },
  };

</script>
