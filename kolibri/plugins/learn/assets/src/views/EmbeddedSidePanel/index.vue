<template>

  <KGridItem
    :layout="{ span: 3 }"
    :style="{
      color: $themeTokens.text,
      backgroundColor: $themeTokens.surface,
    }"
    class="side-panel"
  >
    <div>
      <!-- search by keyword -->
      <h2 class="title">
        Keywords
      </h2>
      <SearchBox />
      <h2 class="section title">
        Categories
      </h2>
      <!-- list of category metadata - clicking prompts a filter modal -->
      <div
        span="4"
        class="category-list-item"
      >
        <KButton
          text="All Categories"
          appearance="flat-button"
          :appearanceOverrides="customCategoryStyles"
          @click="$emit('filterResults', value)"
        />
      </div>
      <div
        v-for="(value, category) in libraryCategoriesList"
        :key="category"
        span="4"
        class="category-list-item"
      >
        <KButton
          :text="value"
          appearance="flat-button"
          :appearanceOverrides="customCategoryStyles"
          iconAfter="chevronRight"
          @click="$emit('openModal', value)"
        />
      </div>
      <div
        span="4"
        class="category-list-item"
      >
        <KButton
          text="Other"
          appearance="flat-button"
          :appearanceOverrides="customCategoryStyles"
          @click="$emit('filterResults', value)"
        />
      </div>
      <ActivityButtonsGroup class="section" />
      <!-- Filter results by learning activity, displaying all options -->
      <SelectGroup :channels="channels" class="section" />
      <div class="section">
        <div
          v-for="(value, activity) in resourcesNeededList"
          :key="activity"
          span="4"
          alignment="center"
        >
          <KCheckbox
            key="adHocLearners"
            :checked="isSelected(value)"
            :label="value"
            @change="$emit('toggleSelected', $event)"
          />
        </div>
      </div>
    </div>
  </KGridItem>

</template>


<script>

  import { LibraryCategories, ResourcesNeededTypes } from 'kolibri.coreVue.vuex.constants';
  import SearchBox from '../SearchBox';
  import commonLearnStrings from '../commonLearnStrings';
  import ActivityButtonsGroup from './ActivityButtonsGroup';
  import SelectGroup from './SelectGroup';

  // import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';

  export default {
    name: 'EmbeddedSidePanel',
    components: {
      SearchBox,
      ActivityButtonsGroup,
      SelectGroup,
    },
    mixins: [commonLearnStrings],
    props: {
      channels: {
        type: Array,
        required: true,
      },
    },
    computed: {
      libraryCategoriesList() {
        let libraryCategories = {};
        Object.keys(LibraryCategories).map(key => {
          let newValue = LibraryCategories[key].replace('_', ' ');
          libraryCategories[key] = newValue;
        });
        return libraryCategories;
      },
      resourcesNeededList() {
        let resourcesNeeded = {};
        Object.keys(ResourcesNeededTypes).map(key => {
          let newValue =
            ResourcesNeededTypes[key].charAt(0).toUpperCase() + ResourcesNeededTypes[key].slice(1);
          newValue = newValue.split('_').join(' ');
          resourcesNeeded[key] = newValue;
        });
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
    },
    methods: {
      isSelected(value) {
        console.log(value);
        return value === 'For beginners' ? false : true;
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
