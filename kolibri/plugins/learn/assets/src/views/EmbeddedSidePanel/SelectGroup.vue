<template>

  <div>
    <KSelect
      v-if="languageOptionsList.length"
      :options="languageOptionsList"
      class="selector"
      :value="selectedLanguage"
      :label="coreString('languageLabel')"
      @change="val => handleChange('languages', val)"
    />
    <KSelect
      v-if="contentLevelsList.length"
      :options="contentLevelsList"
      class="selector"
      :value="selectedLevel"
      :label="coreString('levelLabel')"
      @change="val => handleChange('grade_levels', val)"
    />
    <KSelect
      v-if="channelOptionsList.length"
      :options="channelOptionsList"
      class="selector"
      :value="selectedChannel"
      :label="coreString('channelLabel')"
      @change="val => handleChange('channels', val)"
    />
    <KSelect
      v-if="accessibilityOptionsList.length"
      :options="accessibilityOptionsList"
      class="selector"
      :value="selectedAccessibilityFilter"
      :label="coreString('accessibility')"
      @change="val => handleChange('accessibility_labels', val)"
    />
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { ContentLevels, AccessibilityCategories } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import plugin_data from 'plugin_data';

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
    },
    computed: {
      languageOptionsList() {
        const options = [];
        plugin_data.languages.forEach(language => {
          options.push({
            value: language.id,
            label: language.lang_name,
          });
        });
        return options;
      },
      accessibilityOptionsList() {
        const options = [];
        Object.keys(AccessibilityCategories).map(key => {
          const value = AccessibilityCategories[key];
          if (plugin_data.accessibilityLabels.includes(value)) {
            options.push({
              value,
              label: this.coreString(camelCase(key)),
            });
          }
        });
        return options;
      },
      contentLevelsList() {
        return Object.keys(ContentLevels)
          .map(key => {
            const value = ContentLevels[key];
            if (plugin_data.gradeLevels.includes(value)) {
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
                label: this.coreString(translationKey),
              };
            }
          })
          .filter(Boolean);
      },
      channelOptionsList() {
        return plugin_data.channels.map(channel => ({
          value: channel.id,
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
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selector {
    padding-top: 10px;
    background-color: rgba(189, 189, 189, 0.25);
    border-radius: 2px;

    /deep/ .ui-select-display-value {
      margin-left: 10px;
    }

    /deep/ .ui-select-label-text {
      position: static;
      top: 0;
      margin-left: 10px;
      font-size: 12px;
      color: black;
    }

    /deep/ .ui-icon {
      margin-right: 10px;
    }
  }

</style>
