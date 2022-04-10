<template>

  <div>

    <KModal
      v-if="windowIsLarge"
      :title="$tr('title')"
      :cancelText="coreString('closeAction')"
      size="large"
      @cancel="$emit('cancel')"
    >
      <CategorySearchOptions
        ref="searchOptions"
        :selectedCategory="selectedCategory"
        :availableLabels="availableLabels"
        v-on="$listeners"
      />
    </KModal>
    <div v-else>
      <h2>{{ $tr('title') }}</h2>
      <CategorySearchOptions
        ref="searchOptions"
        :selectedCategory="selectedCategory"
        :availableLabels="availableLabels"
        v-on="$listeners"
      />
    </div>


  </div>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { Categories, CategoriesLookup } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindowMixin from 'kolibri.coreVue.mixins.responsiveWindowMixin';
  import CategorySearchOptions from './CategorySearchOptions';
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

  // Create a nested object representing the hierarchy of categories
  for (let value of Object.values(Categories)
    // Sort by the length of the key path to deal with
    // shorter key paths first.
    .sort((a, b) => a.length - b.length)) {
    // Split the value into the paths so we can build the object
    // down the path to create the nested representation
    const ids = value.split('.');
    // Start with an empty path
    let path = '';
    // Start with the global object
    let nested = libraryCategories;
    for (let fragment of ids) {
      // Add the fragment to create the path we examine
      path += fragment;
      // Check to see if this path is one of the paths
      // that is available on this device
      if (availablePaths[path]) {
        // Lookup the human readable key for this path
        const nestedKey = CategoriesLookup[path];
        // Check if we have already represented this in the object
        if (!nested[nestedKey]) {
          // If not, add an object representing this category
          nested[nestedKey] = {
            // The value is the whole path to this point, so the value
            // of the key.
            value: path,
            // Nested is an object that contains any subsidiary categories
            nested: {},
          };
        }
        // For the next stage of the loop the relevant object to edit is
        // the nested object under this key.
        nested = nested[nestedKey].nested;
        // Add '.' to path so when we next append to the path,
        // it is properly '.' separated.
        path += '.';
      } else {
        break;
      }
    }
  }

  export default {
    name: 'CategorySearchModal',
    components: {
      CategorySearchOptions,
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
    },
    methods: {
      /**
       * @public
       * Focuses on correct first element for FocusTrap depending on content
       * rendered in the search modal.
       */
      focusFirstEl() {
        this.$refs.searchOptions.$el.querySelector('.filter-list-title > h2 > a').focus();
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
