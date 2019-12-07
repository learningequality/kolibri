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
          <SelectOptions
            v-if="displaySelectOptions"
            class="select-options ib"
            :isSelected="isSelected"
            @addResource="$emit('addResource', content)"
            @removeResource="$emit('removeResource', content)"
          />
        </KGridItem>
      </KGrid>
      <CoachContentLabel :value="content.num_coach_contents" :isTopic="false" />
      <p v-if="completionRequirements">
        {{ completionRequirements }}
      </p>
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
  import QuestionList from './QuestionList';
  import ContentArea from './ContentArea';
  import SelectOptions from './SelectOptions';

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
      SelectOptions,
      CoachContentLabel,
      InfoIcon,
      MultiPaneLayout,
    },
    mixins: [commonCoreStrings],
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
      completionRequirements() {
        if (this.completionData) {
          const { m: correct, n: total } = this.completionData;
          return this.$tr('completionRequirements', { correct, total });
        }
        return false;
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
    methods: {
      questionLabel(questionIndex) {
        if (!this.isExercise) {
          return '';
        }
        const questionNumber = questionIndex + 1;
        return this.coreString('questionNumberLabel', { questionNumber });
      },
    },
    $trs: {
      completionRequirements: 'Completion: {correct, number} out of {total, number} correct',
      authorDataHeader: 'Author',
      licenseDataHeader: 'License',
      copyrightHolderDataHeader: 'Copyright holder',
    },
  };

</script>


<style lang="scss" scoped>

  .meta {
    margin-bottom: 16px;
    font-size: smaller;
  }

  .content-area {
    padding: 16px 0;
  }

</style>
