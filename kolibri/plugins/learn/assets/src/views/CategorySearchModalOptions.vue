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
      :disabled="availablePaths && !availablePaths[nestedObject.value]"
      :style="availablePaths && !availablePaths[nestedObject.value] ?
        { textColor: 'grey' } : { cursor: 'pointer' }"
    >
      <KIcon
        icon="info"
        size="large"
      />
      <h2
        class="filter-list-item"
        @click="$emit('input', nestedObject.value)"
      >
        {{ coreString(camelCase(key)) }}
      </h2>
      <div class="filter-list-item">
        <a
          v-for="(item, nestedKey) in nestedObject.nested"
          :key="item.value"
          :disabled="availablePaths && !availablePaths[item.value]"
          :style="availablePaths && !availablePaths[item.value] ?
            { textColor: 'grey' } : { cursor: 'pointer' }"

          @click="$emit('input', item.value)"
        >
          {{ coreString(camelCase(nestedKey)) }}
        </a>

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
      :disabled="availablePaths && !availablePaths[value.value]"
      :style="availablePaths && !availablePaths[value.value] ?
        { color: 'grey' } : { cursor: 'pointer' }"
      @click="$emit('input', value.value)"
    >
      <KIcon
        icon="info"
        size="large"
      />
      <h2
        class="filter-list-item"
        @click="$emit('input', value.value)"
      >
        {{ coreString(camelCase(key)) }}
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
        type: String,
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
          console.log('paths');
          console.log(paths);
          return paths;
        }
        console.log('null');
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
    },
    methods: {
      camelCase(val) {
        return camelCase(val);
      },
    },
  };

</script>
