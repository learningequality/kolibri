<template>

  <div>
    <KSelect
      :options="languageOptionsList"
      class="selector"
      :value="selectedLanguage"
      :label="coreString('languageLabel')"
      @change="val => handleChange('languages', val)"
    />
    <KSelect
      :options="contentLevelsList"
      class="selector"
      :value="selectedLevel"
      :label="coreString('levelLabel')"
      @change="val => handleChange('grade_levels', val)"
    />
    <KSelect
      v-if="channels"
      :options="channelOptionsList"
      class="selector"
      :value="selectedChannel"
      :label="coreString('channelLabel')"
      @change="val => handleChange('channels', val)"
    />
    <KSelect
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
  import languageSwitcherMixin from '../../../../../../core/assets/src/views/language-switcher/mixin.js';

  export default {
    name: 'SelectGroup',
    mixins: [languageSwitcherMixin, commonCoreStrings],
    props: {
      channels: {
        type: Array,
        required: true,
      },
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
        let options = [];
        this.languageOptions.forEach(language => {
          options.push({
            value: language.id,
            label: language.lang_name,
          });
        });
        return options;
      },
      accessibilityOptionsList() {
        let options = [];
        Object.keys(AccessibilityCategories).map(key => {
          options.push({
            value: AccessibilityCategories[key],
            label: this.coreString(camelCase(key)),
          });
        });
        return options;
      },
      contentLevelsList() {
        let options = [];
        Object.keys(ContentLevels).map(key => {
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
          options.push({
            value: ContentLevels[key],
            label: this.coreString(translationKey),
          });
        });
        return options;
      },
      channelOptionsList() {
        let options = [];
        this.channels.forEach(channel => {
          options.push({
            value: channel.id,
            label: channel.title,
          });
        });
        return options;
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
