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
            :disabled="lang.disabled || isActiveButNotSelected('languages', lang)"
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
            :disabled="level.disabled || isActiveButNotSelected('grade_levels', level)"
            :label="level.label"
            @change="handleChange('grade_levels', level)"
          />
        </template>
      </AccordionItem>
    </AccordionContainer>

    <AccordionContainer
      v-if="showChannels && channelOptionsList.length"
      class="accordion-select"
    >
      <AccordionItem
        :title="coreString('channelLabel')"
        :headerAppearanceOverrides="accordionHeaderStyles(selectedChannel.value)"
        :contentAppearanceOverrides="{
          maxHeight: '256px',
          overflowY: 'scroll',
        }"
      >
        <template #content>
          <KRadioButtonGroup>
            <KRadioButton
              v-for="channel in channelOptionsList"
              :key="'channel-' + channel.value"
              :buttonValue="channel.value"
              :currentValue="selectedChannel['value'] || ''"
              :label="channel.label"
              @change="handleChange('channels', channel)"
            />
          </KRadioButtonGroup>
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
            :disabled="a11y.disabled || isActiveButNotSelected('accessibility_labels', a11y)"
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
            :disabled="need.disabled || isActiveButNotSelected('learner_needs', need)"
            :label="need.label"
            @change="handleChange('learner_needs', need)"
          />
        </template>
      </AccordionItem>
    </AccordionContainer>
  </div>

</template>


<script>

  import {
    NoCategories,
    ContentLevels,
    AccessibilityCategories,
  } from 'kolibri.coreVue.vuex.constants';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
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
        availableChannels,
        searchableLabels,
        activeSearchTerms,
      } = injectBaseSearch();
      return {
        availableResourcesNeeded,
        activeSearchTerms,
        availableGradeLevels,
        availableAccessibilityOptions,
        availableLanguages,
        availableLibraryCategories,
        availableChannels,
        searchableLabels,
        // This color is not in KDS but was specifically requested in the design
        //selectedHighlightColor: '#ECF0FE',
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
      showChannels: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      availableNeeds() {
        if (this.searchableLabels) {
          const needs = {};
          for (const key of this.searchableLabels.learner_needs) {
            const root = key.split('.')[0];
            needs[root] = true;
            needs[key] = true;
          }
          return needs;
        }
        return null;
      },
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
      enabledLanguageOptions() {
        return this.languageOptionsList.filter(l => !l.disabled);
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
      enabledContentLevels() {
        return this.contentLevelOptions.filter(c => !c.disabled);
      },
      channelOptionsList() {
        return this.availableChannels.map(channel => ({
          value: channel.id,
          disabled: this.searchableLabels && !this.searchableLabels.channels.includes(channel.id),
          label: channel.name,
        }));
      },
      enabledChannelOptions() {
        return this.channelOptionsList.filter(c => !c.disabled);
      },
      langId() {
        return Object.keys(this.value.languages)[0];
      },
      accessId() {
        return Object.keys(this.value.accessibility_labels)[0];
      },
      selectedLanguage() {
        if (!this.langId && this.enabledLanguageOptions.length === 1) {
          return this.enabledLanguageOptions[0];
        }
        return this.languageOptionsList.find(o => o.value === this.langId) || {};
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
        return this.contentLevelOptions.find(o => o.value === this.levelId) || {};
      },
      channelId() {
        return Object.keys(this.value.channels)[0];
      },
      selectedChannel() {
        if (!this.channelId && this.enabledChannelOptions.length === 1) {
          return this.enabledChannelOptions[0];
        }
        return this.channelOptionsList.find(o => o.value === this.channelId) || {};
      },
    },
    methods: {
      noCategories() {
        this.$emit('input', { ...this.value, categories: { [NoCategories]: true } });
      },
      anySelectedFor(inputKey, values) {
        return values.some(value => this.isSelected(inputKey, value));
      },
      isSelected(inputKey, value) {
        return this.value[inputKey][value.value] === true;
      },
      isActiveButNotSelected(inputKey, value) {
        // When a filter is selected, the other filters are disabled if they are no longer
        // applicable. Additionally, some filters are automatically selected because they're
        // mutually inclusive with the user's selections.
        // This basically just answers the question "is this filter active, but *not* because they
        // directly selected it"
        return (
          !this.isSelected(inputKey, value) &&
          Object.values(this.activeSearchTerms[inputKey]).includes(value)
        );
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
        if (field === 'channels') {
          // Channels are a radio button, so only when the user selects a new value
          // will we emit the change
          if (!prevFieldValue[value.value]) {
            this.$emit('input', {
              ...this.value,
              [field]: { [value.value]: true },
            });
          }
        } else {
          if (value && this.isSelected(field, value)) {
            delete prevFieldValue[value.value];
            this.$emit('input', { ...this.value, [field]: prevFieldValue });
          } else {
            this.$emit('input', {
              ...this.value,
              [field]: { ...prevFieldValue, [value.value]: true },
            });
          }
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
