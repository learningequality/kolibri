<template>

  <div>
    <AccordionContainer
      :multiple="false"
      style="border: 0"
    >
      <AccordionItem
        v-if="Object.keys(availableLibraryCategories).length"
        isOpenByDefault
        class="accordion-select"
        :title="$tr('categoryLabel')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(activeCategories.some(cat => isCategoryActive(cat)))
        "
        :style="accordionItemStyles"
      >
        <template
          v-if="searchLoading"
          #content
        >
          <KCircularLoader />
        </template>
        <template
          v-else
          #content
        >
          <KButton
            v-for="(category, key) in availableLibraryCategories"
            :key="'cat-' + key"
            appearance="flat-button"
            class="category-button"
            :class="$computedClass({ ':hover': { background: selectedHighlightColor } })"
            :style="{
              background: isCategoryActive(category.value) ? selectedHighlightColor : '',
            }"
            :text="coreString(category.value)"
            :disabled="
              availableRootCategories &&
                !availableRootCategories[category.value] &&
                !isCategoryActive(category.value)
            "
            @click="handleCategory(key)"
          >
            <template #icon>
              <KIcon
                class="category-icon"
                :icon="categoryIcon(key)"
                :color="$themeTokens.primary"
              />
            </template>
            <KIcon
              v-if="category.nested"
              icon="chevronRight"
              class="category-icon-after"
            />
          </KButton>
        </template>
      </AccordionItem>
      <AccordionItem
        v-if="languageOptionsList.length"
        class="accordion-select"
        :title="coreString('languageLabel')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('languages', languageOptionsList))
        "
        :disabled="searchLoading || languageOptionsList.every(opt => opt.disabled)"
        :style="accordionItemStyles"
      >
        <template #content>
          <KCheckbox
            v-for="lang in languageOptionsList"
            :key="'lang-' + lang.value"
            :checked="isSelected('languages', lang)"
            :disabled="lang.disabled"
            :label="lang.label"
            @change="handleChange('languages', lang)"
          />
        </template>
      </AccordionItem>
      <AccordionItem
        v-if="contentLevelOptions.length"
        class="accordion-select"
        :title="coreString('levelLabel')"
        :disabled="searchLoading || contentLevelOptions.every(opt => opt.disabled)"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('grade_levels', contentLevelOptions))
        "
        :style="accordionItemStyles"
      >
        <template #content>
          <KCheckbox
            v-for="level in contentLevelOptions"
            :key="'level-' + level.value"
            :checked="isSelected('grade_levels', level)"
            :disabled="level.disabled"
            :label="level.label"
            @change="handleChange('grade_levels', level)"
          />
        </template>
      </AccordionItem>
      <AccordionItem
        v-if="accessibilityOptionsList.length"
        class="accordion-select"
        :title="coreString('accessibility')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('accessibility_labels', accessibilityOptionsList))
        "
        :disabled="searchLoading || accessibilityOptionsList.every(opt => opt.disabled)"
        :style="accordionItemStyles"
      >
        <template #content>
          <KCheckbox
            v-for="a11y in accessibilityOptionsList"
            :key="'a11y-' + a11y.value"
            :checked="isSelected('accessibility_labels', a11y)"
            :disabled="a11y.disabled"
            :label="a11y.label"
            @change="handleChange('accessibility_labels', a11y)"
          />
        </template>
      </AccordionItem>
      <AccordionItem
        class="accordion-select"
        :title="coreString('showResources')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('learner_needs', needsOptionsList))
        "
        :disabled="searchLoading || needsOptionsList.every(opt => opt.disabled)"
        :style="accordionItemStyles"
      >
        <template #content>
          <KCheckbox
            v-for="need in needsOptionsList"
            :key="'resource-need-' + need.value"
            :checked="isSelected('learner_needs', need)"
            :disabled="need.disabled"
            :label="need.label"
            @change="handleChange('learner_needs', need)"
          />
        </template>
      </AccordionItem>
    </AccordionContainer>
  </div>

</template>


<script>

  import { ContentLevels, AccessibilityCategories } from 'kolibri/constants';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import { getCategoryIcon } from 'kolibri-common/utils/categoryIcon';

  export default {
    name: 'AccordionSelectGroup',
    components: { AccordionItem, AccordionContainer },
    mixins: [commonCoreStrings],
    setup() {
      const {
        availableResourcesNeeded,
        availableGradeLevels,
        availableAccessibilityOptions,
        availableLanguages,
        availableLibraryCategories,
        searchLoading,
        searchableLabels,
      } = injectBaseSearch();

      return {
        availableResourcesNeeded,
        availableGradeLevels,
        availableAccessibilityOptions,
        availableLanguages,
        availableLibraryCategories,
        searchLoading,
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
      handleCategory: {
        type: Function,
        required: true,
      },
      activeCategories: {
        type: Array,
        required: true,
      },
    },
    computed: {
      needsOptionsList() {
        return Object.keys(this.availableResourcesNeeded).map(k => {
          const val = this.availableResourcesNeeded[k];
          return {
            value: val,
            disabled: this.searchableLabels && !this.searchableLabels.learner_needs.includes(val),
            label: this.coreString(val),
          };
        });
      },
      selectedHighlightColor() {
        // get right color
        return '#D9E1FD';
      },
      availableRootCategories() {
        if (this.searchableLabels) {
          const roots = {};
          for (const key of this.searchableLabels.categories) {
            const root = key.split('.')[0];
            roots[root] = true;
          }
          return roots;
        }
        return null;
      },
      languageOptionsList() {
        return this.availableLanguages.map(language => {
          return {
            value: language.id,
            disabled:
              this.searchableLabels && !this.searchableLabels.languages.includes(language.id),
            label: language.lang_name,
          };
        });
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
      contentLevelOptions() {
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
      accordionItemStyles() {
        return {
          border: `1px solid ${this.$themeTokens.fineLine}`,
        };
      },
    },
    methods: {
      anySelectedFor(inputKey, values) {
        return values.some(value => this.isSelected(inputKey, value));
      },
      isSelected(inputKey, value) {
        return this.value[inputKey][value.value] === true;
      },
      accordionHeaderStyles(selected) {
        return {
          padding: `0.25em 0 0.25em ${selected ? '0.5em' : '0.75em'}`,
          background: selected ? this.selectedHighlightColor : this.$themePalette.grey.v_100,
          borderLeft: selected ? `0.25em solid ${this.$themeTokens.primary}` : 'none',
        };
      },
      handleChange(field, value) {
        // Copy rather than mutate: `value` is the cached value of the searchTerms
        // computed, which the search watcher also holds as its `oldValue` — editing
        // it in place makes the subsequent equality check a no-op and skips the search.
        const nextFieldValue = { ...this.value[field] };
        if (value && this.isSelected(field, value)) {
          delete nextFieldValue[value.value];
        } else {
          nextFieldValue[value.value] = true;
        }
        this.$emit('input', { ...this.value, [field]: nextFieldValue });
      },
      isCategoryActive(categoryValue) {
        // Takes the dot separated category value and checks if it is active
        return this.activeCategories.some(k => k.includes(categoryValue));
      },
      categoryIcon: getCategoryIcon,
    },
    $trs: {
      categoryLabel: {
        message: 'Category',
        context:
          'When user can select the categories, this is the header for the categories section',
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

  .accordion-select:not(:last-child) {
    margin-bottom: 1em;
  }

  .category-button {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.25em 0.5em;
    font-weight: normal;
    text-align: left;
    text-transform: none;
  }

  .category-icon {
    width: 24px;
    height: 24px;
    margin-right: 1em;
  }

  .category-icon-after {
    position: absolute;
    top: 0.75em;
    right: 0.5em;
    width: 20px;
    height: 20px;
    margin-left: 0.5em;
  }

  .category-button:not(:last-child) {
    margin-bottom: 0.5em;
  }

</style>
