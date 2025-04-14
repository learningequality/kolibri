<template>

  <p v-if="workingQuestions.length === 0">
    {{ emptyQuestionsList$() }}
  </p>
  <QuestionsAccordion
    v-else
    :questions="workingQuestions"
    :getQuestionContent="getQuestionContent"
    :selectedQuestions="cartSelectedQuestions"
    @selectQuestions="handleSelectQuestions"
    @deselectQuestions="handleDeselectQuestions"
  >
    <template #header-trailing-actions>
      <KIconButton
        icon="trash"
        :tooltip="coreString('deleteAction')"
        :aria-label="coreString('deleteAction')"
        :disabled="cartSelectedQuestions.length === 0"
        @click="deleteQuestions"
      />
    </template>
    <template #questionExtraContent="{ question }">
      <div class="question-content-container">
        <div class="question-content-container-left-items">
          <KIcon icon="practiceSolid" />
          <span>{{ getQuestionContent(question).title }}</span>
        </div>
        <KIconButton
          icon="emptyTopic"
          :ariaLabel="openExerciseLabel$()"
          :tooltip="openExerciseLabel$()"
          @click="navigateToParent(question)"
        />
      </div>
    </template>
  </QuestionsAccordion>

</template>


<script>

  import uniq from 'lodash/uniq';
  import { watch } from 'vue';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { searchAndFilterStrings } from 'kolibri-common/strings/searchAndFilterStrings';
  import { PageNames } from '../../../../../../constants';
  import { useGoBack } from '../../../../../../composables/usePreviousRoute';
  import QuestionsAccordion from '../../../../../common/QuestionsAccordion.vue';

  export default {
    name: 'ManageSelectedQuestions',
    components: {
      QuestionsAccordion,
    },
    mixins: [commonCoreStrings],
    setup(props) {
      const { openExerciseLabel$, numberOfSelectedQuestions$, emptyQuestionsList$ } =
        searchAndFilterStrings;

      const goBack = useGoBack({
        fallbackRoute: {
          name: PageNames.QUIZ_SELECT_RESOURCES_INDEX,
        },
      });

      props.setTitle(numberOfSelectedQuestions$({ count: props.selectedQuestions.length }));
      props.setGoBack(goBack);

      watch(
        () => props.selectedQuestions,
        () => {
          props.setTitle(numberOfSelectedQuestions$({ count: props.selectedQuestions.length }));
        },
      );

      return {
        openExerciseLabel$,
        emptyQuestionsList$,
      };
    },
    props: {
      setTitle: {
        type: Function,
        default: () => {},
      },
      setGoBack: {
        type: Function,
        default: () => {},
      },
      selectedQuestions: {
        type: Array,
        required: true,
      },
      selectedResources: {
        type: Array,
        required: true,
      },
    },
    data() {
      return {
        cartSelectedQuestions: [],
      };
    },
    computed: {
      workingQuestions() {
        return this.selectedQuestions;
      },
    },
    methods: {
      handleSelectQuestions(questionItems) {
        this.cartSelectedQuestions = uniq([...this.cartSelectedQuestions, ...questionItems]);
      },
      handleDeselectQuestions(questionItems) {
        this.cartSelectedQuestions = this.cartSelectedQuestions.filter(
          q => !questionItems.includes(q),
        );
      },
      getQuestionContent(question) {
        return this.selectedResources.find(resource => resource.id === question.exercise_id);
      },
      deleteQuestions() {
        const questionsToDelete = this.cartSelectedQuestions.map(q =>
          this.workingQuestions.find(wq => wq.item === q),
        );
        this.cartSelectedQuestions = [];
        this.$emit('deselectQuestions', questionsToDelete);
      },
      navigateToParent(question) {
        const pageName = PageNames.QUIZ_PREVIEW_RESOURCE;

        this.$router.push({
          name: pageName,
          query: { contentId: question.exercise_id },
        });
      },
    },
  };

</script>


<style lang="scss" scoped>

  .question-content-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0 8px;
  }

  .question-content-container-left-items {
    display: flex;
    gap: 5px;

    span {
      margin-top: 2px;
    }
  }

</style>
