<template>

  <KGridItem
    :layout="{ span: width }"
    :style="{
      color: $themeTokens.text,
      backgroundColor: $themeTokens.surface,
    }"
    class="side-panel"
  >
    <div v-if="topics && topicsListDisplayed">
      <div v-for="t in topics" :key="t.id">
        <h3>
          {{ t.title }}
        </h3>
      </div>
    </div>
    <div v-else :style="sidePanelStyle">
      <!-- search by keyword -->
      <h2 class="title">
        {{ $tr('keywords') }}
      </h2>
      <SearchBox
        key="channel-search"
        placeholder="findSomethingToLearn"
        :value="value.keywords || ''"
        @change="val => $emit('input', { ...value, keywords: val })"
      />
      <h2 class="section title">
        {{ $tr('categories') }}
      </h2>
      <!-- list of category metadata - clicking prompts a filter modal -->
      <div
        span="4"
        class="category-list-item"
      >
        <KButton
          :text="$tr('allCategories')"
          appearance="flat-button"
          :appearanceOverrides="customCategoryStyles"
          @click="$emit('input', { ...value, categories: [] })"
        />
      </div>
      <div
        v-for="(val, category) in libraryCategoriesList"
        :key="category"
        span="4"
        class="category-list-item"
      >
        <KButton
          :text="coreString(camelCase(category))"
          appearance="flat-button"
          :appearanceOverrides="customCategoryStyles"
          iconAfter="chevronRight"
          @click="$emit('currentCategory', category)"
        />
      </div>
      <div
        span="4"
        class="category-list-item"
      >
        <KButton
          :text="coreString('None of the above')"
          appearance="flat-button"
          :appearanceOverrides="customCategoryStyles"
          @click="$emit('input', { ...value, categories: { null: true } })"
        />
      </div>
      <ActivityButtonsGroup class="section" @input="handleActivity" />
      <!-- Filter results by learning activity, displaying all options -->
      <SelectGroup v-model="inputValue" :channels="channels" class="section" />
      <div class="section">
        <div
          v-for="(val, activity) in resourcesNeededList"
          :key="activity"
          span="4"
          alignment="center"
        >
          <KCheckbox
            :checked="value.learner_needs[val]"
            :label="coreString(activity)"
            @change="handleNeed(val)"
          />
        </div>
      </div>
    </div>
  </KGridItem>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import { LibraryCategories, ResourcesNeededTypes } from 'kolibri.coreVue.vuex.constants';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import SearchBox from '../SearchBox';
  import commonLearnStrings from '../commonLearnStrings';
  import ActivityButtonsGroup from './ActivityButtonsGroup';
  import SelectGroup from './SelectGroup';

  const resourcesNeededShown = ['FOR_BEGINNERS', 'PEOPLE', 'PAPER_PENCIL', 'INTERNET', 'MATERIALS'];

  const resourcesNeeded = {};
  resourcesNeededShown.map(key => {
    const value = ResourcesNeededTypes[key];
    // For some reason the string ids for these items are in PascalCase not camelCase
    if (key === 'PEOPLE') {
      key = 'ToUseWithTeachersAndPeers';
    } else if (key === 'PAPER_PENCIL') {
      key = 'ToUseWithPaperAndPencil';
    } else if (key === 'INTERNET') {
      key = 'NeedsInternet';
    } else if (key === 'MATERIALS') {
      key = 'NeedsMaterials';
    } else if (key === 'FOR_BEGINNERS') {
      key = 'ForBeginners';
    }
    resourcesNeeded[key] = value;
  });

  export default {
    name: 'EmbeddedSidePanel',
    components: {
      SearchBox,
      ActivityButtonsGroup,
      SelectGroup,
    },
    mixins: [commonLearnStrings, commonCoreStrings],
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
            'keywords',
          ];
          return inputKeys.every(k => Object.prototype.hasOwnProperty.call(value, k));
        },
      },
      channels: {
        type: Array,
        required: true,
      },
      topics: {
        type: Array,
        default() {
          return [];
        },
      },
      width: {
        type: Number || String,
        required: true,
      },
      topicPage: {
        type: Boolean,
        required: false,
      },
      topicsListDisplayed: {
        type: Boolean,
        required: false,
      },
    },
    computed: {
      inputValue: {
        get() {
          return this.value;
        },
        set(value) {
          this.$emit('input', value);
        },
      },
      libraryCategoriesList() {
        return LibraryCategories;
      },
      resourcesNeededList() {
        return resourcesNeeded;
      },
      customCategoryStyles() {
        return {
          color: this.$themeTokens.text,
          width: '100%',
          border: '2px solid transparent',
          'text-transform': 'capitalize',
          'text-align': 'left',
          'font-weight': 'normal',
          position: 'relative',
          transition: 'none',
          ':hover': {
            'background-color': 'rgb(235, 210, 235)',
            border: '2px',
            'border-color': '#996189',
            'border-style': 'solid',
            'border-radius': '4px',
            'line-spacing': '0',
          },
        };
      },
      sidePanelStyle() {
        if (this.topicPage) {
          return { position: 'relative' };
        }
        return null;
      },
    },
    methods: {
      handleActivity(activity) {
        let learning_activities;
        if (activity) {
          learning_activities = {
            [activity]: true,
          };
        } else {
          learning_activities = {};
        }
        this.$emit('input', { ...this.value, learning_activities });
      },
      handleNeed(need) {
        if (this.value.learner_needs[need]) {
          const learner_needs = {};
          for (let n in this.value.learner_needs) {
            if (n !== need) {
              learner_needs[n] = true;
            }
          }
          this.$emit('input', { ...this.value, learner_needs });
        } else {
          this.$emit('input', {
            ...this.value,
            learner_needs: { ...this.value.learner_needs, [need]: true },
          });
        }
      },
      camelCase(val) {
        return camelCase(val);
      },
    },
    $trs: {
      keywords: {
        message: 'Keywords',
        context: 'Section header label in the Library page sidebar.',
      },
      categories: {
        message: 'Categories',
        context: 'Section header label in the Library page sidebar.',
      },
      allCategories: {
        message: 'All categories',
        context: 'Button label in the Library page sidebar.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .side-panel {
    position: fixed;
    height: 100%;
    padding: 30px 40px !important;
    padding-bottom: 120px !important;
    margin-right: 16px;
    overflow: scroll;
    font-size: 14px;
    box-shadow: 0 3px 3px 0 #00000040;
  }

  .section {
    margin-top: 40px;
  }

  .card-grid {
    margin-top: 40px;
    margin-left: 20px;
  }

  /deep/ .prop-icon {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  .title {
    margin-bottom: 16px;
  }

</style>
