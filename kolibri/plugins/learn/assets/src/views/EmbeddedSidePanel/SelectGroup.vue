<template>

  <div>
    <KSelect
      v-if="languageOptionsList.length"
      :options="languageOptionsList"
      class="selector"
      :clearable="true"
      :value="selectedLanguage"
      :label="coreString('languageLabel')"
      :style="{ color: $themeTokens.text }"
      @change="val => handleChange('languages', val)"
    />
    <KSelect
      v-if="contentLevelsList.length"
      :options="contentLevelsList"
      class="selector"
      :clearable="true"
      :value="selectedLevel"
      :label="coreString('levelLabel')"
      :style="{ color: $themeTokens.text }"
      @change="val => handleChange('grade_levels', val)"
    />
    <KSelect
      v-if="showChannels && channelOptionsList.length"
      :options="channelOptionsList"
      class="selector"
      :clearable="true"
      :value="selectedChannel"
      :label="coreString('channelLabel')"
      :style="{ color: $themeTokens.text }"
      @change="val => handleChange('channels', val)"
    />
    <KSelect
      v-if="accessibilityOptionsList.length"
      :options="accessibilityOptionsList"
      class="selector"
      :clearable="true"
      :value="selectedAccessibilityFilter"
      :label="coreString('accessibility')"
      :style="{ color: $themeTokens.text }"
      @change="val => handleChange('accessibility_labels', val)"
    />
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { ContentLevels, AccessibilityCategories } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import plugin_data from 'plugin_data';

  const contentLevelsList = Object.keys(ContentLevels).filter(key => {
    const value = ContentLevels[key];
    // TODO rtibbles: remove this condition
    return plugin_data.gradeLevels.includes(value) || process.env.NODE_ENV !== 'production';
  });

  const accessibilityOptionsList = Object.keys(AccessibilityCategories).filter(key => {
    const value = AccessibilityCategories[key];
    // TODO rtibbles: remove this condition
    return plugin_data.accessibilityLabels.includes(value) || process.env.NODE_ENV !== 'production';
  });

  export default {
    name: 'SelectGroup',
    mixins: [commonCoreStrings],
    props: {
      value: {
        type: Object,
        required: true,
        validator(value) {
          const inputKeys = ['channels', 'accessibility_labels', 'languages', 'grade_levels'];
          return inputKeys.every(k => Object.prototype.hasOwnProperty.call(value, k));
        },
      },
      availableLabels: {
        type: Object,
        required: false,
        default: null,
      },
      showChannels: {
        type: Boolean,
        default: true,
      },
    },
    computed: {
      languageOptionsList() {
        return plugin_data.languages.map(language => {
          return {
            value: language.id,
            disabled: this.availableLabels && !this.availableLabels.languages.includes(language.id),
            label: language.lang_name,
          };
        });
      },
      accessibilityOptionsList() {
        return accessibilityOptionsList.map(key => {
          const value = AccessibilityCategories[key];
          return {
            value,
            disabled:
              this.availableLabels && !this.availableLabels.accessibility_labels.includes(value),
            label: this.coreString(camelCase(key)),
          };
        });
      },
      contentLevelsList() {
        return contentLevelsList.map(key => {
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
            disabled: this.availableLabels && !this.availableLabels.grade_levels.includes(value),
            label: this.coreString(translationKey),
          };
        });
      },
      channelOptionsList() {
        return plugin_data.channels.map(channel => ({
          value: channel.id,
          disabled: this.availableLabels && !this.availableLabels.channels.includes(channel.id),
          label: channel.name,
        }));
      },
      selectedLanguage() {
        const langId = Object.keys(this.value.languages)[0];
        return this.languageOptionsList.find(o => o.value === langId) || {};
      },
      selectedAccessibilityFilter() {
        const accessId = Object.keys(this.value.accessibility_labels)[0];
        return this.accessibilityOptionsList.find(o => o.value === accessId) || {};
      },
      selectedLevel() {
        const levelId = Object.keys(this.value.grade_levels)[0];
        return this.contentLevelsList.find(o => o.value === levelId) || {};
      },
      selectedChannel() {
        const channelId = Object.keys(this.value.channels)[0];
        return this.channelOptionsList.find(o => o.value === channelId) || {};
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
  .selector {
    height: 52px !important;
    padding-top: 10px;
    background-color: rgba(189, 189, 189, 0.25);
    border-radius: 2px;

    /deep/ .ui-icon {
      margin-right: 10px;
    }
  }

</style>
