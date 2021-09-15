<template>

  <div>
    <KSelect
      :options="languageOptionsList"
      class="selector"
      :value="selectedLanguage"
      :label="$tr('language')"
    />
    <KSelect
      :options="contentLevelsList"
      class="selector"
      :value="selectedLevel"
      :label="$tr('level')"
    />
    <KSelect
      v-if="channels"
      :options="channelOptionsList"
      class="selector"
      :value="selectedChannel"
      :label="coreString('channelLabel')"
    />
    <KSelect
      :options="accessibilityOptionsList"
      class="selector"
      :value="selectedAccessibilityFilter"
      :label="$tr('accessibility')"
    />
  </div>

</template>


<script>

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
            label: this.coreString(AccessibilityCategories[key]),
          });
        });
        return options;
      },
      contentLevelsList() {
        let options = [];
        Object.keys(ContentLevels).map(key => {
          options.push({
            value: ContentLevels[key],
            label: this.coreString(ContentLevels[key]),
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
        return this.languageOptionsList.find(o => o.value === this.value) || {};
      },
      selectedAccessibilityFilter() {
        return this.accessibilityOptionsList.find(o => o.value === this.value) || {};
      },
      selectedLevel() {
        return this.contentLevelsList.find(o => o.value === this.value) || {};
      },
      selectedChannel() {
        return this.channelOptionsList.find(o => o.value === this.value) || {};
      },
    },
    $trs: {
      accessibility: 'Accessibility',
      level: 'Level',
      language: 'Language',
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
