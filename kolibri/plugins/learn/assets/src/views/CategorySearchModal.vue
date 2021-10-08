<template>

  <KModal
    :title="$tr('title')"
    :cancelText="coreString('closeAction')"
    size="large"
    @cancel="$emit('cancel')"
  >

    <KFixedGrid
      v-if="categoryGroupIsNested"
      :numCols="12"
      :style="{ margin: '24px' }"
    >
      <KFixedGridItem
        v-for="(nestedObject, key) in displaySelectedCategories"
        :key="key"
        :span="4"
      >
        <KIcon
          icon="info"
          size="large"
        />
        <h2>{{ coreString(camelCase(key)) }}</h2>
        <p
          v-for="(item, nestedKey) in nestedObject.nested"
          :key="item.value"
          @click="$emit('input', item.value)"
        >
          {{ coreString(camelCase(nestedKey)) }}
        </p>
      </KFixedGridItem>
    </KFixedGrid>
    <KFixedGrid
      v-else
      :numCols="12"
      :style="{ margin: '24px' }"
    >
      <KFixedGridItem
        v-for="(value, key) in displaySelectedCategories"
        :key="value.value"
        :span="4"
        @click="$emit('input', value.value)"
      >
        <KIcon
          icon="info"
          size="large"
        />
        <h2>{{ coreString(camelCase(key)) }}</h2>
      </KFixedGridItem>
    </KFixedGrid>
  </KModal>

</template>


<script>

  import camelCase from 'lodash/camelCase';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import { LibraryCategories } from 'kolibri.coreVue.vuex.constants';

  export default {
    name: 'CategorySearchModal',
    mixins: [commonCoreStrings],
    props: {
      selectedCategory: {
        type: String,
        required: true,
        default: null,
      },
    },
    computed: {
      categoryGroupIsNested() {
        return Object.values(this.displaySelectedCategories).some(
          obj => Object.keys(obj.nested).length
        );
      },
      displaySelectedCategories() {
        return LibraryCategories[this.selectedCategory].nested;
      },
    },
    methods: {
      camelCase(val) {
        return camelCase(val);
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
