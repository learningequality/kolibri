<template>

  <CoreBase
    :immersivePage="true"
    immersivePageIcon="arrow_back"
    immersivePagePrimary
    :immersivePageRoute="toolbarRoute"
    :appBarTitle="$tr('createNewExam')"
    :authorized="userIsAuthorized"
    authorizedRole="adminOrCoach"
    :pageTitle="$tr('documentTitle')"
    :marginBottom="72"
  >

    <KPageContainer>

      <h1>{{ $tr('createNewExam') }}</h1>

      <UiAlert
        v-if="showError && !inSearchMode"
        type="error"
        :dismissible="false"
      >
        {{ selectionIsInvalidText }}
      </UiAlert>

      <h2>{{ detailsString }}</h2>

      <KGrid>
        <KGridItem sizes="100, 100, 50" percentage>
          <KTextbox
            ref="title"
            v-model.trim="examTitle"
            :label="$tr('title')"
            :autofocus="true"
            :maxlength="100"
          />
        </KGridItem>
        <KGridItem sizes="100, 100, 50" percentage>
          <KTextbox
            ref="questionsInput"
            v-model.trim.number="numQuestions"
            type="number"
            :min="1"
            :max="maxQs"
            :invalidText="$tr('numQuestionsBetween')"
            :invalid="numQuestionsInvalid"
            :label="$tr('numQuestions')"
            class="number-field"
            @blur="numQuestionsBlurred = true"
          />
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === 1"
            @click="numQuestions -= 1"
          >
            <mat-svg name="remove" category="content" />
          </UiIconButton>
          <UiIconButton
            type="flat"
            aria-hidden="true"
            class="number-btn"
            :disabled="numQuestions === maxQs"
            @click="numQuestions += 1"
          >
            <mat-svg name="add" category="content" />
          </UiIconButton>
        </KGridItem>
      </KGrid>

      <h2>{{ $tr('chooseExercises') }}</h2>

      <LessonsSearchBox
        class="search-box"
        @searchterm="handleSearchTerm"
      />

      <LessonsSearchFilters
        v-if="inSearchMode"
        v-model="filters"
        :searchTerm="searchTerm"
        :searchResults="searchResults"
      />
      <ResourceSelectionBreadcrumbs
        v-else
        :ancestors="ancestors"
        :channelsLink="channelsLink"
        :topicsLink="topicsLink"
      />

      <h2>{{ topicTitle }}</h2>
      <p>{{ topicDescription }}</p>

      <ContentCardList
        :contentList="filteredContentList"
        :showSelectAll="selectAllIsVisible"
        :viewMoreButtonState="viewMoreButtonState"
        :selectAllChecked="selectAllChecked"
        :selectAllIndeterminate="selectAllIndeterminate"
        :contentIsChecked="contentIsSelected"
        :contentIsIndeterminate="contentIsIndeterminate"
        :contentHasCheckbox="contentHasCheckbox"
        :contentCardMessage="selectionMetadata"
        :contentCardLink="contentLink"
        @changeselectall="toggleTopicInWorkingResources"
        @change_content_card="toggleSelected"
        @moreresults="handleMoreResults"
      />

      <Bottom v-if="inSearchMode">
        <KRouterLink
          appearance="raised-button"
          :text="$tr('exitSearchButtonLabel')"
          primary
          :to="toolbarRoute"
        />
      </Bottom>
      <Bottom v-else>
        <KRouterLink
          appearance="flat-button"
          :text="coachStrings.$tr('goBackAction')"
          :to="toolbarRoute"
        />
        <KButton
          :text="$tr('continueButtonlabel')"
          primary
          @click="continueProcess"
        />
      </Bottom>

    </KPageContainer>

  </CoreBase>

</template>


<script>

  import { mapState, mapActions, mapGetters } from 'vuex';
  import { crossComponentTranslator } from 'kolibri.utils.i18n';
  import { ContentNodeKinds } from 'kolibri.coreVue.vuex.constants';
  import responsiveWindow from 'kolibri.coreVue.mixins.responsiveWindow';
  import KButton from 'kolibri.coreVue.components.KButton';
  import KTextbox from 'kolibri.coreVue.components.KTextbox';
  import KRouterLink from 'kolibri.coreVue.components.KRouterLink';
  import UiAlert from 'kolibri.coreVue.components.UiAlert';
  import KGrid from 'kolibri.coreVue.components.KGrid';
  import KGridItem from 'kolibri.coreVue.components.KGridItem';
  import flatMap from 'lodash/flatMap';
  import pickBy from 'lodash/pickBy';
  import UiIconButton from 'kolibri.coreVue.components.UiIconButton';
  import { PageNames } from '../../../constants/';
  import { MAX_QUESTIONS } from '../../../constants/examConstants';
  import LessonsSearchBox from '../../plan/LessonResourceSelectionPage/SearchTools/LessonsSearchBox';
  import LessonsSearchFilters from '../../plan/LessonResourceSelectionPage/SearchTools/LessonsSearchFilters';
  import ResourceSelectionBreadcrumbs from '../../plan/LessonResourceSelectionPage/SearchTools/ResourceSelectionBreadcrumbs';
  import ContentCardList from '../../plan/LessonResourceSelectionPage/ContentCardList';
  import QuizDetailEditor from '../../common/QuizDetailEditor';
  import commonCoach from '../../common';
  import Bottom from './Bottom';

  const quizDetailStrings = crossComponentTranslator(QuizDetailEditor);

  export default {
    // TODO: Rename this to 'ExamCreationPage'
    name: 'CreateExamPage',
    components: {
      KTextbox,
      KRouterLink,
      KButton,
      UiAlert,
      LessonsSearchBox,
      LessonsSearchFilters,
      ResourceSelectionBreadcrumbs,
      ContentCardList,
      KGrid,
      KGridItem,
      UiIconButton,
      Bottom,
    },
    mixins: [responsiveWindow, commonCoach],
    $trs: {
      createNewExam: 'Create new quiz',
      chooseExercises: 'Select topics or exercises',
      title: 'Title',
      duplicateTitle: 'A quiz with that name already exists',
      numQuestions: 'Number of questions',
      examRequiresTitle: 'This field is required',
      numQuestionsBetween: 'Enter a number between 1 and 50',
      numQuestionsExceed:
        'The max number of questions based on the exercises you selected is {maxQuestionsFromSelection}. Select more exercises to reach {inputNumQuestions} questions, or lower the number of questions to {maxQuestionsFromSelection}.',
      numQuestionsNotMet:
        'Add more exercises to reach 40 questions. Alternately, lower the number of quiz questions.',
      noneSelected: 'No exercises are selected',
      preview: 'Preview',
      continueButtonlabel: 'Continue',
      // TODO: Interpolate strings correctly
      added: "Added '{item}'",
      removed: "Removed '{item}'",
      selected: '{count, number, integer} total selected',
      documentTitle: 'Create new quiz',
      exitSearchButtonLabel: 'Exit search',
      // TODO: Handle singular/plural
      selectionInformation:
        '{count, number, integer} of {total, number, integer} resources selected',
    },
    data() {
      return {
        showError: false,
        moreResultsState: null,
        // null corresponds to 'All' filter value
        filters: {
          channel: this.$route.query.channel || null,
          kind: this.$route.query.kind || null,
          role: this.$route.query.role || null,
        },
        numQuestionsBlurred: false,
      };
    },
    computed: {
      ...mapState(['pageName', 'toolbarRoute']),
      ...mapGetters({
        channels: 'getChannels',
      }),
      ...mapGetters('examCreation', ['numRemainingSearchResults']),
      ...mapState('examCreation', [
        'title',
        'numberOfQuestions',
        'contentList',
        'selectedExercises',
        'availableQuestions',
        'searchResults',
        'ancestors',
        'examsModalSet',
      ]),
      maxQs() {
        return MAX_QUESTIONS;
      },
      detailsString() {
        return quizDetailStrings.$tr('details');
      },
      examTitle: {
        get() {
          return this.$store.state.examCreation.title;
        },
        set(value) {
          this.$store.commit('examCreation/SET_TITLE', value);
        },
      },
      numQuestions: {
        get() {
          return this.$store.state.examCreation.numberOfQuestions;
        },
        set(value) {
          // If it is cleared out, then set vuex state to null so it can be caught during
          // validation
          if (value === '') {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', null);
          }
          if (value && value >= 1 && value <= this.maxQs) {
            this.$store.commit('examCreation/SET_NUMBER_OF_QUESTIONS', value);
            this.$store.dispatch('examCreation/updateSelectedQuestions');
          }
        },
      },
      filteredContentList() {
        const { role } = this.filters || {};
        if (!this.inSearchMode) {
          return this.contentList;
        }
        return this.searchResults.results.filter(contentNode => {
          let passesFilters = true;
          if (role === 'nonCoach') {
            passesFilters = passesFilters && contentNode.num_coach_contents === 0;
          }
          if (role === 'coach') {
            passesFilters = passesFilters && contentNode.num_coach_contents > 0;
          }
          return passesFilters;
        });
      },
      allExercises() {
        const topics = this.contentList.filter(({ kind }) => kind === ContentNodeKinds.TOPIC);
        const exercises = this.contentList.filter(({ kind }) => kind === ContentNodeKinds.EXERCISE);
        const topicExercises = flatMap(topics, ({ exercises }) => exercises);
        return [...exercises, ...topicExercises];
      },
      addableExercises() {
        return this.allExercises.filter(exercise => !this.selectedExercises[exercise.id]);
      },
      selectAllChecked() {
        return this.addableExercises.length === 0;
      },
      selectAllIndeterminate() {
        if (this.selectAllChecked) {
          return false;
        }
        return this.addableExercises.length !== this.allExercises.length;
      },
      inSearchMode() {
        return this.pageName === PageNames.EXAM_CREATION_SEARCH;
      },
      searchTerm() {
        return this.$route.params.searchTerm;
      },
      selectAllIsVisible() {
        return !this.inSearchMode && this.pageName !== PageNames.EXAM_CREATION_ROOT;
      },
      viewMoreButtonState() {
        if (!this.inSearchMode) {
          return 'no_more_results';
        }
        if (this.moreResultsState === 'waiting' || this.moreResultsState === 'error') {
          return this.moreResultsState;
        }
        if (!this.numRemainingSearchResults) {
          return 'no_more_results';
        }
        return 'visible';
      },
      selectionIsInvalidText() {
        if (Object.keys(this.selectedExercises).length === 0) {
          return this.$tr('noneSelected');
        }
        return null;
      },
      channelsLink() {
        return {
          name: PageNames.EXAM_CREATION_ROOT,
          params: {
            classId: this.classId,
          },
        };
      },
      topicTitle() {
        if (!this.ancestors.length) {
          return '';
        }
        return this.ancestors[this.ancestors.length - 1].title;
      },
      topicDescription() {
        if (!this.ancestors.length) {
          return '';
        }
        return this.ancestors[this.ancestors.length - 1].description;
      },
      numQuestionsInvalid() {
        return (
          this.numQuestionsBlurred &&
          (this.numQuestions === null || this.numQuestions < 0 || this.numQuestions > this.maxQs)
        );
      },
    },
    watch: {
      filters(newVal) {
        this.$router.push({
          query: { ...this.$route.query, ...pickBy(newVal) },
        });
      },
    },
    methods: {
      ...mapActions(['createSnackbar']),
      ...mapActions('examCreation', [
        'addToSelectedExercises',
        'removeFromSelectedExercises',
        'setSelectedExercises',
        'fetchAdditionalSearchResults',
      ]),
      contentLink(content) {
        if (content.kind === ContentNodeKinds.TOPIC || content.kind === ContentNodeKinds.CHANNEL) {
          return {
            name: PageNames.EXAM_CREATION_TOPIC,
            params: {
              classId: this.classId,
              topicId: content.id,
            },
          };
        }
        const { query } = this.$route;
        return {
          name: PageNames.EXAM_CREATION_PREVIEW,
          params: {
            classId: this.classId,
            contentId: content.id,
          },
          query: {
            ...query,
            ...pickBy({
              searchTerm: this.$route.params.searchTerm,
            }),
          },
        };
      },
      contentHasCheckbox() {
        return this.pageName !== PageNames.EXAM_CREATION_ROOT;
      },
      contentIsSelected(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          return content.exercises.every(exercise => Boolean(this.selectedExercises[exercise.id]));
        } else {
          return Boolean(this.selectedExercises[content.id]);
        }
      },
      contentIsIndeterminate(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          const everyExerciseSelected = content.exercises.every(exercise =>
            Boolean(this.selectedExercises[exercise.id])
          );
          if (everyExerciseSelected) {
            return false;
          }
          return content.exercises.some(exercise => Boolean(this.selectedExercises[exercise.id]));
        }
        return false;
      },
      selectionMetadata(content) {
        if (content.kind === ContentNodeKinds.TOPIC) {
          const count = content.exercises.filter(exercise =>
            Boolean(this.selectedExercises[exercise.id])
          ).length;
          if (count === 0) {
            return '';
          }
          const total = content.exercises.length;
          return this.$tr('selectionInformation', { count, total });
        }
        return '';
      },
      toggleTopicInWorkingResources(isChecked) {
        let snackbarString;
        if (isChecked) {
          this.showError = false;
          this.addToSelectedExercises(this.addableExercises);
          snackbarString = 'added';
        } else {
          this.removeFromSelectedExercises(this.allExercises);
          snackbarString = 'removed';
        }
        this.createSnackbar(this.$tr(snackbarString, { item: this.topicTitle }));
      },
      toggleSelected({ checked, contentId }) {
        let exercises;
        let snackbarString;
        const contentNode = this.contentList.find(item => item.id === contentId);
        const isTopic = contentNode.kind === ContentNodeKinds.TOPIC;
        if (checked && isTopic) {
          this.showError = false;
          exercises = contentNode.exercises;
          this.addToSelectedExercises(exercises);
          snackbarString = 'added';
        } else if (checked && !isTopic) {
          this.showError = false;
          exercises = [contentNode];
          this.addToSelectedExercises(exercises);
          snackbarString = 'added';
        } else if (!checked && isTopic) {
          exercises = contentNode.exercises;
          this.removeFromSelectedExercises(exercises);
          snackbarString = 'removed';
        } else if (!checked && !isTopic) {
          exercises = [contentNode];
          this.removeFromSelectedExercises(exercises);
          snackbarString = 'removed';
        }

        if (snackbarString) {
          this.createSnackbar(this.$tr(snackbarString, { item: contentNode.title }));
        }
      },
      handleMoreResults() {
        this.moreResultsState = 'waiting';
        this.fetchAdditionalSearchResults({
          searchTerm: this.searchTerm,
          kind: this.filters.kind,
          channelId: this.filters.channel,
          currentResults: this.searchResults.results,
        })
          .then(() => {
            this.moreResultsState = null;
          })
          .catch(() => {
            this.moreResultsState = 'error';
          });
      },
      continueProcess() {
        if (this.numQuestionsInvalid) {
          this.$refs.questionsInput.focus();
        }
        if (this.selectionIsInvalidText) {
          this.showError = true;
        } else {
          this.$router.push({ name: PageNames.EXAM_CREATION_QUESTION_SELECTION });
        }
      },
      handleSearchTerm(searchTerm) {
        const lastId = this.$route.query.last_id || this.$route.params.topicId;
        this.$router.push({
          name: PageNames.EXAM_CREATION_SEARCH,
          params: {
            searchTerm,
          },
          query: {
            last_id: lastId,
          },
        });
      },
      topicsLink(topicId) {
        return {
          name: PageNames.EXAM_CREATION_TOPIC,
          params: {
            classId: this.classId,
            topicId,
          },
        };
      },
    },
  };

</script>


<style lang="scss" scoped>

  .search-box {
    display: inline-block;
    vertical-align: middle;
  }

  .buttons-container {
    text-align: right;
    button {
      margin: 0 0 0 16px;
    }
  }

  .items {
    display: inline-block;
  }

  .numItems {
    display: inline-block;
    margin: 8px;
    list-style: none;
  }

  .number-field {
    display: inline-block;
    margin-right: 8px;
  }

  .number-btn {
    position: relative;
    top: 16px;
    display: inline-block;
    vertical-align: top;
  }

</style>
