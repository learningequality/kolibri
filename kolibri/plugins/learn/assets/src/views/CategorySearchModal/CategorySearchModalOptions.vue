<template>

  <KFixedGrid
    v-if="categoryGroupIsNested"
    :numCols="numCols"
    :style="{ margin: '24px' }"
  >
    <KFixedGridItem
      v-for="(nestedObject, key) in displaySelectedCategories"
      :key="key"
      :span="span"
      class="category-item"
    >
      <div class="filter-list-title">
        <KIcon
          :icon="icon(key)"
          size="large"
        />
        <h2>
          <KButton
            :text="coreString(camelCase(key))"
            appearance="basic-link"
            :appearanceOverrides="appearanceOverrides"
            :disabled="availablePaths && !availablePaths[nestedObject.value]"
            @click="$emit('input', nestedObject.value)"
          />
        </h2>

      </div>
      <div
        v-for="(item, nestedKey) in nestedObject.nested"
        :key="item.value"
      >
        <KButton
          :text="coreString(camelCase(nestedKey))"
          :appearanceOverrides="appearanceOverrides"
          appearance="basic-link"
          @click="$emit('input', item.value)"
        />
      </div>
    </KFixedGridItem>
  </KFixedGrid>
  <KFixedGrid
    v-else
    :numCols="numCols"
    :style="{ margin: '24px' }"
  >
    <KFixedGridItem
      v-for="(value, key) in displaySelectedCategories"
      :key="value.value"
      :span="span"
      class="category-item"
      @click="$emit('input', value.value)"
    >
      <KIcon
        :icon="icon(key)"
        size="large"
      />
      <h2>
        <KButton
          class="filter-list-item"
          appearance="basic-link"
          :text="coreString(camelCase(key))"
          :disabled="availablePaths && !availablePaths[value.value]"
          :appearanceOverrides="appearanceOverrides"
          @click="$emit('input', value.value)"
        />
      </h2>

    </KFixedGridItem>
  </KFixedGrid>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { Categories, CategoriesLookup } from 'kolibri.coreVue.vuex.constants';
  import plugin_data from 'plugin_data';

  const availablePaths = {};

  if (process.env.NODE_ENV !== 'production') {
    // TODO rtibbles: remove this condition
    Object.assign(availablePaths, CategoriesLookup);
  } else {
    plugin_data.categories.map(key => {
      const paths = key.split('.');
      let path = '';
      for (let path_segment of paths) {
        path = path === '' ? path_segment : path + '.' + path_segment;
        availablePaths[path] = true;
      }
    });
  }

  const libraryCategories = {};

  for (let subjectKey of Object.entries(Categories)
    .sort((a, b) => a[0].length - b[0].length)
    .map(a => a[0])) {
    const ids = Categories[subjectKey].split('.');
    let path = '';
    let nested = libraryCategories;
    for (let fragment of ids) {
      path += fragment;
      if (availablePaths[path]) {
        const nestedKey = CategoriesLookup[path];
        if (!nested[nestedKey]) {
          nested[nestedKey] = {
            value: path,
            nested: {},
          };
        }
        nested = nested[nestedKey].nested;
        path += '.';
      } else {
        break;
      }
    }
  }

  export default {
    name: 'CategorySearchModalOptions',
    mixins: [commonCoreStrings],
    props: {
      selectedCategory: {
        type: String,
        required: true,
        default: null,
      },
      availableLabels: {
        type: Object,
        required: false,
        default: null,
      },
      numCols: {
        type: String,
        required: true,
        default: null,
      },
      span: {
        type: [Number, String],
        required: true,
        default: null,
      },
    },
    computed: {
      availablePaths() {
        if (this.availableLabels) {
          const paths = {};
          for (let key of this.availableLabels.categories) {
            const keyPaths = key.split('.');
            let path = '';
            for (let keyPath of keyPaths) {
              path = path === '' ? keyPath : path + '.' + keyPath;
              paths[path] = true;
            }
          }
          return paths;
        }
        return null;
      },
      categoryGroupIsNested() {
        return Object.values(this.displaySelectedCategories).some(
          obj => Object.keys(obj.nested).length
        );
      },
      displaySelectedCategories() {
        return libraryCategories[this.selectedCategory].nested;
      },
      appearanceOverrides() {
        return {
          color: this.$themeTokens.text,
          marginTop: '8px',
        };
      },
    },
    methods: {
      camelCase(val) {
        return camelCase(val);
      },
      icon(key) {
        // 'language' icon is already in use and it doesn't follow the
        // same naming pattern for category resources, so set separate
        // case to return the correct icon
        if (camelCase(key) === 'languageLearning') {
          return 'language';
        } else if (
          camelCase(key) === 'technicalAndVocationalTraining' ||
          camelCase(key) === 'professionalSkills'
        ) {
          // similarly, 'skills' icon is used for both of these resources
          // and doesn't follow same pattern
          return 'skillsResource';
        } else if (camelCase(key) === 'foundationsLogicAndCriticalThinking') {
          // naming mismatch
          return 'logicCriticalThinkingResource';
        } else {
          return `${camelCase(key)}Resource`;
        }
      },
    },
  };

</script>


<style lang="scss" scoped>

  h2 {
    margin-top: 4px;
    margin-bottom: 4px;
  }

  /deep/ .link-text {
    text-decoration: none !important;
  }
  .category-item {
    margin-bottom: 32px;
  }

</style>
