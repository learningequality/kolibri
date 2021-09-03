<template>

  <div>
    <KSelect
      :options="languageOptionsList"
      class="selector"
      :value="selectedLanguage"
    />
    <KSelect
      :options="contentLevelsList"
      class="selector"
      :value="selectedLevel"
    />
    <KSelect
      :options="channelOptionsList"
      class="selector"
      :value="selectedChannel"
    />
    <KSelect
      :options="accessibilityOptionsList"
      class="selector"
      :value="selectedAccessibilityFilter"
    />
  </div>

</template>


<script>

  import { ContentLevels, AccessibilityCategories } from 'kolibri.coreVue.vuex.constants';
  import languageSwitcherMixin from '../../../../../../core/assets/src/views/language-switcher/mixin.js';

  export default {
    name: 'SelectGroup',
    mixins: [languageSwitcherMixin],
    props: {
      channels: {
        type: Array,
        required: true,
      },
    },
    computed: {
      languageOptionsList() {
        return this.languageOptions.map(lang => lang.lang_name);
      },
      accessibilityOptionsList() {
        return this.parseList(AccessibilityCategories);
      },
      contentLevelsList() {
        return this.parseList(ContentLevels);
      },
      channelOptionsList() {
        let channelList = [];
        if (this.channels) {
          this.channels.forEach(channel => {
            channelList.push(channel.title);
          });
        }
        return channelList;
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
    methods: {
      parseList(data) {
        let newList = [];
        Object.keys(data).map(key => {
          let newValue;
          if (data[key].charAt(0)) {
            newValue = data[key].charAt(0).toUpperCase() + data[key].slice(1);
          }
          newValue = newValue.split('_').join(' ');
          newList.push(newValue);
        });
        return newList;
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

    /deep/ .ui-icon {
      margin-right: 10px;
    }
  }

</style>
