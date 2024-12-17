<template>

  <div>
    <LanguageSelector
      v-if="showLanguages"
      :style="selectorStyle"
    />
    <KSelect
      v-if="contentLevelsList.length"
      :options="contentLevelsList"
      :disabled="!levelId && enabledContentLevels.length < 2"
      class="selector"
      :clearable="!(!levelId && enabledContentLevels.length < 2)"
      :clearText="coreString('clearAction')"
      :value="selectedLevel"
      :label="coreString('levelLabel')"
      :style="selectorStyle"
      @change="val => handleChange('grade_levels', val && val.value)"
    />
    <KSelect
      v-if="accessibilityOptionsList.length"
      :options="accessibilityOptionsList"
      :disabled="!accessId && enabledAccessibilityOptions.length < 2"
      class="selector"
      :clearable="!(!accessId && enabledAccessibilityOptions.length < 2)"
      :clearText="coreString('clearAction')"
      :value="selectedAccessibilityFilter"
      :label="coreString('accessibility')"
      :style="selectorStyle"
      @change="val => handleChange('accessibility_labels', val && val.value)"
    />
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { ContentLevels, AccessibilityCategories } from 'kolibri/constants';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import LanguageSelector from './LanguageSelector';

  export default {
    name: 'SelectGroup',
    components: {
      LanguageSelector,
    },
    mixins: [commonCoreStrings],
    setup() {
      const { availableGradeLevels, availableAccessibilityOptions, searchableLabels } =
        injectBaseSearch();
      return {
        availableGradeLevels,
        availableAccessibilityOptions,
        searchableLabels,
      };
    },
    props: {
      value: {
        type: Object,
        required: true,
        validator(value) {
          const inputKeys = ['accessibility_labels', 'languages', 'grade_levels'];
          return inputKeys.every(k => Object.prototype.hasOwnProperty.call(value, k));
        },
      },
      showLanguages: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      selectorStyle() {
        return {
          height: '52px',
          paddingTop: '10px',
          borderRadius: '2px',
        };
      },
      accessibilityOptionsList() {
        return this.availableAccessibilityOptions.map(key => {
          const value = AccessibilityCategories[key];
          return {
            value,
            disabled:
              this.searchableLabels && !this.searchableLabels.accessibility_labels.includes(value),
            label: this.coreString(camelCase(key)),
          };
        });
      },
      enabledAccessibilityOptions() {
        return this.accessibilityOptionsList.filter(a => !a.disabled);
      },
      contentLevelsList() {
        return this.availableGradeLevels.map(key => {
          const value = ContentLevels[key];
          let translationKey;
          if (key === 'PROFESSIONAL') {
            translationKey = 'specializedProfessionalTraining';
          } else if (key === 'WORK_SKILLS') {
            translationKey = 'allLevelsWorkSkills';
          } else if (key === 'BASIC_SKILLS') {
            translationKey = 'allLevelsBasicSkills';
          } else {
            translationKey = camelCase(key);
          }
          return {
            value,
            disabled: this.searchableLabels && !this.searchableLabels.grade_levels.includes(value),
            label: this.coreString(translationKey),
          };
        });
      },
      enabledContentLevels() {
        return this.contentLevelsList.filter(c => !c.disabled);
      },
      accessId() {
        return Object.keys(this.value.accessibility_labels)[0];
      },
      selectedAccessibilityFilter() {
        if (!this.accessId && this.enabledAccessibilityOptions.length === 1) {
          return this.enabledAccessibilityOptions[0];
        }
        return this.accessibilityOptionsList.find(o => o.value === this.accessId) || {};
      },
      levelId() {
        return Object.keys(this.value.grade_levels)[0];
      },
      selectedLevel() {
        if (!this.levelId && this.enabledContentLevels.length === 1) {
          return this.enabledContentLevels[0];
        }
        return this.contentLevelsList.find(o => o.value === this.levelId) || {};
      },
    },
    methods: {
      handleChange(field, value) {
        if (value && value.value) {
          this.$emit('input', { ...this.value, [field]: { [value.value]: true } });
        } else {
          this.$emit('input', { ...this.value, [field]: {} });
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  // Do not let text oveflow in select menu
  /deep/ .ui-select-content {
    width: 100%;

    // remove position absolute to prevent text from getting under button
    .overlay-close-button {
      position: unset;
      flex-shrink: 0;
    }
  }

  /deep/ .ui-select-label-text.is-inline {
    position: absolute;
    bottom: 45px;
    left: 10px;
    font-size: 12px;
  }

  /deep/ .ui-select-label-text.is-floating {
    position: absolute;
    bottom: 15px;
    left: 10px;
    font-size: 12px;
  }

  /deep/ .ui-select-display {
    height: 3rem;
    border-bottom: inherit;
  }

  /deep/ .ui-select-display-value {
    position: relative;
    top: 12px;
    flex-grow: 1;
    height: 32px;
    padding-top: 10px;
    padding-left: 20px;
    font-size: 14px;
  }

  /deep/ .ui-icon {
    margin-right: 10px;
  }

</style>
