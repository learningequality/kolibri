<template>

  <div>
    <h2 class="top-category">
      <KButton
        :text="coreString(camelCase(selectedCategory))"
        :appearanceOverrides="appearanceOverrides(topLevelCategory.value, true)"
        appearance="basic-link"
        :disabled="availablePaths && !availablePaths[topLevelCategory.value]"
        @click="$emit('input', topLevelCategory.value)"
      >
        <template #icon>
          <KIcon
            :icon="icon(selectedCategory)"
            class="category-icon"
            :color="$themeTokens.primary"
          />
        </template>
      </KButton>
    </h2>
    <div
      v-for="(nestedObject, key) in displaySelectedCategories"
      :key="key"
      :class="[
        'category-item',
        { 'category-item-with-subitems': Object.keys(nestedObject.nested).length > 0 },
      ]"
    >
      <h3 class="category-heading">
        <KButton
          :text="coreString(camelCase(key))"
          appearance="basic-link"
          :appearanceOverrides="appearanceOverrides(nestedObject.value, true)"
          :disabled="availablePaths && !availablePaths[nestedObject.value]"
          @click="$emit('input', nestedObject.value)"
        >
          <template #icon>
            <KIcon
              :icon="icon(key)"
              class="category-icon"
              :color="$themeTokens.primary"
            />
          </template>
        </KButton>
      </h3>
      <div
        v-if="Object.keys(nestedObject.nested).length"
        class="subcategory-list"
      >
        <KButton
          v-for="(item, nestedKey) in nestedObject.nested"
          :key="item.value"
          :text="coreString(camelCase(nestedKey))"
          :appearanceOverrides="appearanceOverrides(item.value)"
          appearance="basic-link"
          :disabled="availablePaths && !availablePaths[item.value]"
          @click="$emit('input', item.value)"
        />
      </div>
    </div>
  </div>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { injectBaseSearch } from 'kolibri-common/composables/useBaseSearch';
  import { getCategoryIcon } from 'kolibri-common/utils/categoryIcon';

  export default {
    name: 'CategorySearchOptions',
    mixins: [commonCoreStrings],
    setup() {
      const { activeSearchTerms, availableLibraryCategories, searchableLabels } =
        injectBaseSearch();
      return {
        activeSearchTerms,
        availableLibraryCategories,
        searchableLabels,
      };
    },
    props: {
      selectedCategory: {
        type: String,
        required: true,
        default: null,
      },
    },
    computed: {
      availablePaths() {
        if (this.searchableLabels) {
          const paths = {};
          for (const key of this.searchableLabels.categories) {
            const keyPaths = key.split('.');
            let path = '';
            for (const keyPath of keyPaths) {
              path = path === '' ? keyPath : path + '.' + keyPath;
              paths[path] = true;
            }
          }
          return paths;
        }
        return null;
      },
      topLevelCategory() {
        return this.availableLibraryCategories[this.selectedCategory];
      },
      displaySelectedCategories() {
        return this.availableLibraryCategories[this.selectedCategory].nested;
      },
    },
    methods: {
      appearanceOverrides(category, bolded) {
        const activeOverrides = {
          backgroundColor: this.$themeBrand.primary.v_100,
          border: '2px',
          borderColor: this.$themeTokens.primary,
          borderStyle: 'solid',
          borderRadius: '4px',
        };
        const appearanceOverrides = {
          color: this.$themeTokens.text,
          marginTop: '8px',
          paddingTop: '8px',
          paddingBottom: '8px',
          paddingLeft: '8px',
          paddingRight: '8px',
          width: '100%',
          border: '2px solid transparent',
          textAlign: this.isRtl ? 'right' : 'left',
          fontWeight: 'normal',
          textTransform: 'none',
          position: 'relative',
          transition: 'none',
          ':hover': activeOverrides,
        };
        if (bolded) {
          appearanceOverrides.fontWeight = 'bold';
        }
        if (this.activeSearchTerms.categories[category]) {
          Object.assign(appearanceOverrides, activeOverrides);
        }
        return appearanceOverrides;
      },
      camelCase(val) {
        return camelCase(val);
      },
      icon: getCategoryIcon,
    },
  };

</script>


<style lang="scss" scoped>

  .top-category {
    margin-top: 0;
    margin-bottom: 4px;
    font-size: 24px;
  }

  .category-item {
    margin-bottom: 0;
  }

  .category-item-with-subitems {
    margin-bottom: 16px;
  }

  .category-heading {
    margin: 0;
    font-size: 20px;
  }

  .subcategory-list {
    padding-left: 24px;
  }

  .category-icon {
    top: 0;
    margin-right: 4px;
  }

</style>
