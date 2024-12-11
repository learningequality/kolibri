<template>

  <div>
    <AccordionContainer
      v-if="Object.keys(availableLibraryCategories).length"
      class="accordion-select"
    >
      <AccordionItem
        :title="$tr('categoryLabel')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(activeCategories.some(cat => isCategoryActive(cat)))
        "
      >
        <template #content>
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
            <template
              v-if="category.nested"
              #iconAfter
            >
              <KIcon
                icon="chevronRight"
                class="category-icon-after"
              />
            </template>
          </KButton>
          <KButton
            :text="coreString('uncategorized')"
            class="category-button"
            :class="$computedClass({ ':hover': { background: selectedHighlightColor } })"
            :style="{
              background: isCategoryActive('no_categories') ? selectedHighlightColor : '',
            }"
            appearance="flat-button"
            @click="noCategories"
          />
        </template>
      </AccordionItem>
    </AccordionContainer>

    <AccordionContainer
      v-if="languageOptionsList.length"
      class="accordion-select"
    >
      <AccordionItem
        :title="coreString('languageLabel')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('languages', languageOptionsList))
        "
        :disabled="languageOptionsList.every(opt => opt.disabled)"
        :contentAppearanceOverrides="{
          maxHeight: '256px',
          overflowY: 'scroll',
        }"
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
    </AccordionContainer>

    <AccordionContainer
      v-if="contentLevelOptions.length"
      class="accordion-select"
    >
      <AccordionItem
        :title="coreString('levelLabel')"
        :disabled="contentLevelOptions.every(opt => opt.disabled)"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('grade_levels', contentLevelOptions))
        "
        :contentAppearanceOverrides="{
          maxHeight: '256px',
          overflowY: 'scroll',
        }"
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
    </AccordionContainer>

    <AccordionContainer
      v-if="accessibilityOptionsList.length"
      class="accordion-select"
    >
      <AccordionItem
        :title="coreString('accessibility')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('accessibility_labels', accessibilityOptionsList))
        "
        :disabled="accessibilityOptionsList.every(opt => opt.disabled)"
        :contentAppearanceOverrides="{
          maxHeight: '256px',
          overflowY: 'scroll',
        }"
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
    </AccordionContainer>

    <AccordionContainer class="accordion-select">
      <AccordionItem
        :title="coreString('showResources')"
        :headerAppearanceOverrides="
          accordionHeaderStyles(anySelectedFor('learner_needs', needsOptionsList))
        "
        :disabled="needsOptionsList.every(opt => opt.disabled)"
        :contentAppearanceOverrides="{
          maxHeight: '256px',
          overflowY: 'scroll',
        }"
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

  import { NoCategories, ContentLevels, AccessibilityCategories } from 'kolibri/constants';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';

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
        searchableLabels,
      } = injectBaseSearch();

      return {
        availableResourcesNeeded,
        availableGradeLevels,
        availableAccessibilityOptions,
        availableLanguages,
        availableLibraryCategories,
        searchableLabels,
      };
    },
    props: {
      value: {
        type: Object,
        required: true,
        validator(value) {
          const inputKeys = ['channels', 'accessibility_labels', 'languages', 'grade_levels'];
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
    },
    methods: {
      noCategories() {
        if (this.isCategoryActive(NoCategories)) {
          // NoCategories is it's own key for the "Uncategorized" category
          const categories = this.value.categories;
          delete categories[NoCategories];
          this.$emit('input', { ...this.value, categories });
        } else {
          this.$emit('input', { ...this.value, categories: { [NoCategories]: true } });
        }
      },
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
        const prevFieldValue = this.value[field];
        if (value && this.isSelected(field, value)) {
          delete prevFieldValue[value.value];
          this.$emit('input', { ...this.value, [field]: prevFieldValue });
        } else {
          this.$emit('input', {
            ...this.value,
            [field]: { ...prevFieldValue, [value.value]: true },
          });
        }
      },
      isCategoryActive(categoryValue) {
        // Takes the dot separated category value and checks if it is active
        return this.activeCategories.some(k => k.includes(categoryValue));
      },
      categoryIcon() {
        // TODO Add icons to KDS then use them
        return 'categories';
      },
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

  .category-icon {
    position: absolute;
    top: 50%;
    left: 0.5em;
    transform: translateY(-50%);
  }

  .category-icon-after {
    position: absolute;
    top: 50%;
    right: 0.5em;
    transform: translateY(-50%);
  }

  .category-button {
    // Ensure the child KIcons' absolute positioning anchors to this button
    position: relative;
    width: 100%;
    // 0.5em around except on the right where the category icon is
    padding: 0 0.5em 0 2.25em;
    font-weight: normal;
    text-align: left;
    // KButton text formatting overrides
    text-transform: unset;
  }

  .category-button:not(:last-child) {
    margin-bottom: 0.5em;
  }

</style>
