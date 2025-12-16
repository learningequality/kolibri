<template>

  <div>
    <section>
      <HeaderWithOptions>
        <template #header>
          <p>
            <BackLink
              :to="
                group
                  ? classRoute(PageNames.GROUP_LESSON_SUMMARY)
                  : classRoute(PageNames.LESSON_SUMMARY)
              "
              :text="coachString('backToLessonLabel', { lesson: lesson.title })"
            />
          </p>
        </template>
        <template #options>
          <KButton
            :text="coachString('previewAction')"
            @click="$emit('previewClick')"
          />
        </template>
      </HeaderWithOptions>
      <MissingResourceAlert
        v-if="resourceMissing"
        :multiple="false"
      />
      <h1>
        <KLabeledIcon
          :icon="resource.kind"
          :label="resource.title"
        />
      </h1>
    </section>

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

    <HeaderTable>
      <HeaderTableRow
        v-if="practiceQuiz"
        :keyText="$tr('totalQuestionsHeader')"
      >
        <template #value>
          {{ resource.assessmentmetadata.number_of_assessments }}
        </template>
      </HeaderTableRow>

      <HeaderTableRow
        v-else-if="resource.assessmentmetadata && resource.assessmentmetadata.mastery_model"
        :keyText="coreString('masteryModelLabel')"
      >
        <template #value>
          <MasteryModel :masteryModel="resource.assessmentmetadata.mastery_model" />
        </template>
      </HeaderTableRow>
      <HeaderTableRow :keyText="coreString('suggestedTime')">
        <template #value>
          {{ resource.duration || 'Not available' }}
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
        v-if="resource.license_owner"
        :keyText="$tr('copyrightHolderDataHeader')"
      >
        <template #value>
          {{ resource.license_owner }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow v-if="$isPrint && group">
        <template #key>
          {{ coachString('groupNameLabel') }}
        </template>
        <template #value>
          {{ group.name }}
        </template>
      </HeaderTableRow>
      <HeaderTableRow v-if="$isPrint">
        <template #key>
          {{ coachString('lessonLabel') }}
        </template>
        <template #value>
          {{ lesson.title }}
        </template>
      </HeaderTableRow>
    </HeaderTable>

    <HeaderTabs
      v-if="resource.assessmentmetadata"
      :enablePrint="true"
    >
      <HeaderTab
        :text="coachString('reportLabel')"
        :to="
          group
            ? classRoute(PageNames.GROUP_LESSON_EXERCISE_LEARNER_REPORT)
            : classRoute(PageNames.LESSON_EXERCISE_LEARNERS_REPORT)
        "
      />
      <HeaderTab
        :text="coachString('difficultQuestionsLabel')"
        :to="
          group
            ? classRoute(PageNames.GROUP_LESSON_EXERCISE_QUESTIONS_REPORT)
            : classRoute(PageNames.LESSON_EXERCISE_QUESTIONS_REPORT)
        "
      />
    </HeaderTabs>
  </div>

</template>


<script>

  import get from 'lodash/get';
  import Modalities from 'kolibri-constants/Modalities';
  import InfoIcon from 'kolibri-common/components/labels/CoreInfoIcon';
  import SlotTruncator from 'kolibri-common/components/SlotTruncator';
  import commonCoreStrings from 'kolibri/uiText/commonCoreStrings';
  import MissingResourceAlert from 'kolibri-common/components/MissingResourceAlert';
  import { licenseLongName, licenseDescriptionForConsumer } from 'kolibri/uiText/licenses';
  import markdownIt from 'markdown-it';
  import HeaderWithOptions from '../common/HeaderWithOptions';
  import commonCoach from '../common';
  import { PageNames } from '../../constants';

  export default {
    name: 'ReportsResourceHeader',
    components: {
      MissingResourceAlert,
      HeaderWithOptions,
      InfoIcon,
      SlotTruncator,
    },
    mixins: [commonCoach, commonCoreStrings],
    props: {
      resource: {
        type: Object,
        required: true,
      },
    },
    data() {
      return {
        PageNames,
      };
    },
    computed: {
      practiceQuiz() {
        return get(this, ['resource', 'options', 'modality']) === Modalities.QUIZ;
      },
      lesson() {
        return this.lessonMap[this.$route.params.lessonId];
      },
      group() {
        return this.$route.params.groupId && this.groupMap[this.$route.params.groupId];
      },
      description() {
        if (this.resource && this.resource.description) {
          const md = new markdownIt('zero', { breaks: true });
          return md.render(this.resource.description);
        }

        return undefined;
      },
      licenseName() {
        return licenseLongName(this.resource.license_name);
      },
      licenseDescription() {
        return licenseDescriptionForConsumer(
          this.resource.license_name,
          this.resource.license_description,
        );
      },
      resourceMissing() {
        if (Object.keys(this.resource).length !== 0) {
          return !this.$isPrint && !this.resource.available;
        }
        return false;
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
      totalQuestionsHeader: {
        message: 'Total questions',
        context: 'Refers to the total number of questions in a quiz.',
      },
    },
  };

</script>


<style lang="scss" scoped>

  .stats {
    margin-right: 16px;
  }

</style>
