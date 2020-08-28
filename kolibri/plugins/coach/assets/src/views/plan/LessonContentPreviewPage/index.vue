<template>

  <MultiPaneLayout>
    <div slot="header">
      <KGrid>
        <KGridItem
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <h1>
            <KLabeledIcon :icon="content.kind" :label="content.title" />
          </h1>
        </KGridItem>
        <KGridItem
          :layout="{ alignment: 'right' }"
          :layout8="{ span: 4 }"
          :layout12="{ span: 6 }"
        >
          <template v-if="displaySelectOptions">
            <template v-if="isSelected">
              <mat-svg
                class="selected-icon"
                category="action"
                name="check_circle"
              />
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
      <CoachContentLabel :value="content.num_coach_contents" :isTopic="false" />
      <HeaderTable>
        <HeaderTableRow
          v-if="completionData"
          :keyText="coachString('masteryModelLabel')"
        >
          <template #value>
            <MasteryModel
              :model="completionData.type"
              :m="completionData.m"
              :n="completionData.n"
            />
          </template>
        </HeaderTableRow>
      </HeaderTable>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <p v-if="description" dir="auto" v-html="description"></p>
      <ul class="meta">
        <li v-if="content.author">
          {{ $tr('authorDataHeader') }}:
          {{ content.author }}
        </li>
        <li v-if="licenseName">
          {{ $tr('licenseDataHeader') }}:
          {{ licenseName }}
          <InfoIcon
            v-if="licenseDescription"
            :tooltipText="licenseDescription"
            :iconAriaLabel="licenseDescription"
          />
        </li>
        <li v-if="content.license_owner">
          {{ $tr('copyrightHolderDataHeader') }}:
          {{ content.license_owner }}
        </li>
      </ul>
    </div>

    <QuestionList
      v-if="isExercise"
      slot="aside"
      :questions="questions"
      :questionLabel="questionLabel"
      :selectedIndex="selectedQuestionIndex"
      @select="selectedQuestionIndex = $event"
    />

    <ContentArea
      slot="main"
      class="content-area"
      :header="questionLabel(selectedQuestionIndex)"
      :selectedQuestion="selectedQuestion"
      :content="content"
      :isExercise="isExercise"
    />
  </MultiPaneLayout>

</template>


<script>

  import MultiPaneLayout from 'kolibri.coreVue.components.MultiPaneLayout';
  import CoachContentLabel from 'kolibri.coreVue.components.CoachContentLabel';
  import InfoIcon from 'kolibri.coreVue.components.CoreInfoIcon';
  import commonCoreStrings from 'kolibri.coreVue.mixins.commonCoreStrings';
  import {
    licenseLongName,
    licenseDescriptionForConsumer,
  } from 'kolibri.utils.licenseTranslations';
  import markdownIt from 'markdown-it';
  import MasteryModel from '../../common/MasteryModel';
  import commonCoach from '../../common';
  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';

  export default {
    name: 'LessonContentPreviewPage',
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
        default: () => {},
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
      selectedQuestion() {
        if (this.isExercise) {
          return this.questions[this.selectedQuestionIndex];
        }
        return '';
      },
      description() {
        if (this.content) {
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
          this.content.license_description
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
      authorDataHeader: 'Author',
      licenseDataHeader: 'License',
      copyrightHolderDataHeader: 'Copyright holder',
      addedIndicator: 'Added',
      addButtonLabel: 'Add',
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

</style>
