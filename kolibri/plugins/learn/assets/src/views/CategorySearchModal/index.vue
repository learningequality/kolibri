<template>

  <div>

    <KModal
      v-if="position === 'modal'"
      :title="$tr('title')"
      :cancelText="coreString('closeAction')"
      size="large"
      @cancel="$emit('cancel')"
    >
      <CategorySearchModalOptions
        :selectedCategory="selectedCategory"
        :availableLabels="availableLabels"
        :span="windowIsMedium ? 6 : 4"
        numCols="12"
        v-on="$listeners"
      />
    </KModal>

    <h2>{{ $tr('title') }}</h2>
    <CategorySearchModalOptions
      :selectedCategory="selectedCategory"
      :availableLabels="availableLabels"
      span="1"
      numCols="1"
      v-on="$listeners"
    />

  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { Categories, CategoriesLookup } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CategorySearchModalOptions from './CategorySearchModalOptions';
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
    name: 'CategorySearchModal',
    components: {
      CategorySearchModalOptions,
    },
    mixins: [commonCoreStrings, responsiveWindowMixin],
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
      position: {
        type: String,
        required: true,
        validator(val) {
          return ['modal', 'fullscreen'].includes(val);
        },
      },
    },
    $trs: {
      title: {
        message: 'Choose a category',
        context: 'Title of the category selection window',
      },
    },
  };

</script>
