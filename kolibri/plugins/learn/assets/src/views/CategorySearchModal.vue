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
        <h2>All {{ key }}</h2>
        <p
          v-for="item in nestedObject"
          :key="item"
        >
          {{ item }}
        </p>
      </KFixedGridItem>
    </KFixedGrid>
    <KFixedGrid
      v-else
      :numCols="12"
      :style="{ margin: '24px' }"
    >
      <KFixedGridItem
        v-for="value in displaySelectedCategories"
        :key="value"
        :span="4"
      >
        <KIcon
          icon="info"
          size="large"
        />
        <h2>{{ value }}</h2>
      </KFixedGridItem>
    </KFixedGrid>
  </KModal>

</template>


<script>

  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    SchoolCategories,
    MathematicsSubcategories,
    SciencesSubcategories,
    LiteratureSubcategories,
    SocialSciencesSubcategories,
    ArtsSubcategories,
    ComputerScienceSubcategories,
    BasicSkillsCategories,
    WorkCategories,
    // VocationalSubcategories,
    DailyLifeCategories,
    TeachersCategories,
  } from 'kolibri.coreVue.vuex.constants';

  const filterToCategoryNameMap = {
    school: SchoolCategories,
    'basic skills': BasicSkillsCategories,
    work: WorkCategories,
    'daily life': DailyLifeCategories,
    'for teachers': TeachersCategories,
  };

  const schoolSubcategoriesMap = {
    MATHEMATICS: MathematicsSubcategories,
    SCIENCES: SciencesSubcategories,
    LITERATURE: LiteratureSubcategories,
    HISTORY: null,
    SOCIAL_SCIENCES: SocialSciencesSubcategories,
    ARTS: ArtsSubcategories,
    COMPUTER_SCIENCE: ComputerScienceSubcategories,
    // LANGUAGE_LEARNING: LanguageLearningSubcategories,
  };

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
    data: function() {
      return {
        categoryGroupIsNested: {
          type: Boolean,
          default: false,
        },
      };
    },
    computed: {
      displaySelectedCategories() {
        let categoryGroup = filterToCategoryNameMap[this.selectedCategory];
        if (this.selectedCategory === 'school' || this.selectedCategory === 'work') {
          let nestedCategoryObject = {};
          Object.keys(categoryGroup).map(category => {
            let key = categoryGroup[category];
            nestedCategoryObject[key] = schoolSubcategoriesMap[category];
          });
          this.updateNestedGroup(true);
          return nestedCategoryObject;
        }
        this.updateNestedGroup(false);
        return categoryGroup;
      },
    },
    methods: {
      updateNestedGroup(value) {
        this.categoryGroupIsNested = value;
      },
    },
    $trs: {
      title: 'Choose a category',
    },
  };

</script>
