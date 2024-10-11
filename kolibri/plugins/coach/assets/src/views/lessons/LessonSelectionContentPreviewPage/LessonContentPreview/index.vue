<template>

  <MultiPaneLayout>
    <template #header>
      <div>
        <KGrid>
          <KGridItem
            :layout8="{ span: 6 }"
            :layout12="{ span: 9 }"
          >
            <h1>
              <KLabeledIcon :icon="content.kind">
                <template>
                  {{ content.title }}
                </template>
                <template #iconAfter>
                  <CoachContentLabel
                    :value="content.num_coach_contents"
                    :style="{ 'font-size': '0.65em' }"
                    :isTopic="false"
                  />
                </template>
              </KLabeledIcon>
            </h1>
          </KGridItem>
          <KGridItem
            :layout="{ alignment: 'right' }"
            :layout8="{ span: 2 }"
            :layout12="{ span: 3 }"
          >
            <template v-if="displaySelectOptions">
              <template v-if="isSelected">
                <KIcon icon="onDevice" />
                {{ $tr('addedIndicator') }}
              </template>

              <KButton
                v-if="isSelected"
                :text="coreString('removeAction')"
                :primary="true"
                :disabled="disableSelectButton"
                @click="removeResource"
              />
              <KButton
                v-else
                :text="$tr('addButtonLabel')"
                :primary="true"
                :disabled="disableSelectButton"
                @click="addResource"
              />
            </template>
          </KGridItem>
        </KGrid>
        <SlotTruncator
          v-if="description"
          :maxHeight="96"
          :showViewMore="true"
        >
          <!-- eslint-disable vue/no-v-html -->
          <p
            dir="auto"
            v-html="description"
          ></p>
          <!-- eslint-enable -->
        </SlotTruncator>
        <template>
          <HeaderTable>
            <HeaderTableRow
              v-if="practiceQuiz"
              :keyText="$tr('totalQuestionsHeader')"
            >
              <template #value>
                {{ content.assessmentmetadata.number_of_assessments }}
              </template>
            </HeaderTableRow>

            <HeaderTableRow
              v-else-if="completionData"
              :keyText="coreString('masteryModelLabel')"
            >
              <template #value>
                <MasteryModel
                  v-if="content"
                  :masteryModel="completionData"
                />
              </template>
            </HeaderTableRow>
            <HeaderTableRow :keyText="coreString('suggestedTime')">
              <template #value>
                {{ currentContentNode.duration || 'Not available' }}
              </template>
            </HeaderTableRow>
            <HeaderTableRow
              v-if="licenseName"
              :keyText="$tr('licenseDataHeader')"
            >
              <template #value>
                {{ licenseName }}
                <InfoIcon
                  v-if="licenseDescription"
                  :tooltipText="licenseDescription"
                  :iconAriaLabel="licenseDescription"
                />
              </template>
            </HeaderTableRow>
            <HeaderTableRow
              v-if="content.license_owner"
              :keyText="$tr('copyrightHolderDataHeader')"
            >
              <template #value>
                {{ content.license_owner }}
              </template>
            </HeaderTableRow>
          </HeaderTable>
        </template>
      </div>
    </template>

    <template #aside>
      <QuestionList
        v-if="isExercise"
        :questions="questions"
        :questionLabel="questionLabel"
        :selectedIndex="selectedQuestionIndex"
        @select="selectedQuestionIndex = $event"
      />
    </template>

    <template #main>
      <ContentArea
        class="content-area"
        :header="questionLabel(selectedQuestionIndex)"
        :selectedQuestion="selectedQuestion"
        :content="content"
        :isExercise="isExercise"
      />
    </template>
  </MultiPaneLayout>

</template>


<script>

  import get from 'lodash/get';
  import MultiPaneLayout from 'kolibri-common/components/MultiPaneLayout';
  import CoachContentLabel from 'kolibri-common/components/labels/CoachContentLabel';
  import InfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import SlotTruncator from 'kolibri-common/components/SlotTruncator';
  import MasteryModel from 'kolibri-common/components/labels/MasteryModel';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import { licenseLongName, licenseDescriptionForConsumer } from 'kolibri/uiText/licenses';
  import markdownIt from 'markdown-it';
  import Modalities from 'kolibri-constants/Modalities';
  import commonCoach from '../../../common';
  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';

  export default {
    name: 'LessonContentPreview',
    metaInfo() {
      return {
        title: this.currentContentNode.title,
      };
    },
    components: {
      QuestionList,
      ContentArea,
      CoachContentLabel,
      InfoIcon,
      MultiPaneLayout,
      MasteryModel,
      SlotTruncator,
    },
    mixins: [commonCoreStrings, commonCoach],
    props: {
      currentContentNode: {
        type: Object,
        required: true,
      },
      isSelected: {
        type: Boolean,
        required: true,
      },
      questions: {
        type: Array,
        required: false,
        default: () => [],
      },
      completionData: {
        type: Object,
        required: false,
        default: () => ({}),
      },
      displaySelectOptions: {
        type: Boolean,
        required: false,
        default: false,
      },
    },
    data() {
      return {
        selectedQuestionIndex: 0,
        disableSelectButton: false,
      };
    },
    computed: {
      isExercise() {
        return this.content.kind === 'exercise';
      },
      practiceQuiz() {
        return get(this, ['content', 'options', 'modality']) === Modalities.QUIZ;
      },
      selectedQuestion() {
        if (this.isExercise) {
          return this.questions[this.selectedQuestionIndex];
        }
        return '';
      },
      description() {
        if (this.content && this.content.description) {
          const md = new markdownIt('zero', { breaks: true });
          return md.render(this.content.description);
        }

        return undefined;
      },
      content() {
        return this.currentContentNode;
      },
      licenseName() {
        return licenseLongName(this.content.license_name);
      },
      licenseDescription() {
        return licenseDescriptionForConsumer(
          this.content.license_name,
          this.content.license_description,
        );
      },
    },
    watch: {
      isSelected() {
        this.disableSelectButton = false;
      },
    },
    methods: {
      questionLabel(questionIndex) {
        if (!this.isExercise) {
          return '';
        }
        const questionNumber = questionIndex + 1;
        return this.coreString('questionNumberLabel', { questionNumber });
      },
      addResource() {
        this.disableSelectButton = true;
        this.$emit('addResource', this.content);
      },
      removeResource() {
        this.disableSelectButton = true;
        this.$emit('removeResource', this.content);
      },
    },
    $trs: {
      licenseDataHeader: {
        message: 'License',
        context:
          "Refers to the type of license the learning resource has. For example, 'CC BY-NC' meaning 'Creative Commons: attribution, non-commercial'.",
      },
      copyrightHolderDataHeader: {
        message: 'Copyright holder',
        context:
          'Refers to the person or organization who holds the copyright or legal ownership for that resource.',
      },
      addedIndicator: {
        message: 'Added',
        context:
          'Notification that can refer to when resources are added to a lesson, for example.',
      },
      addButtonLabel: {
        message: 'Add',
        context: 'Label for a button to add a resource to lessons.',
      },
      totalQuestionsHeader: {
        message: 'Total questions',
        context: 'Refers to the total number of questions in a quiz.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .selected-icon {
    position: relative;
    top: 4px;
    width: 20px;
    height: 20px;
  }

  .meta {
    margin-bottom: 16px;
    font-size: smaller;
  }

  .content-area {
    padding: 16px 0;
  }

  /deep/ .icon-after {
    margin-top: -5px;
  }

</style>
