<template>

  <SidePanelModal @closePanel="closePanel">
    <SidePanelLayout
      :closePanel="closePanel"
      :contentContainerStyleOverrides="{ paddingTop: '16px' }"
    >
      <template #title>
        <div class="learner-panel-title">
          <KIcon
            icon="person"
            :color="$themeTokens.text"
            class="learner-icon"
          />
          <div>
            <h1 class="learner-name">{{ learner.name }}</h1>
            <p
              class="learner-subtitle"
              :style="{ color: 'var(--tokens-annotation)' }"
            >
              {{ learnerReportLabel$() }}
            </p>
          </div>
        </div>
      </template>

      <!-- Empty state: learner has not attempted the test -->
      <template v-if="!hasAttempted">
        <div class="empty-state">
          <div class="empty-heading-row">
            <KIcon
              icon="inProgress"
              :color="$themeTokens.primary"
              class="empty-icon"
            />
            <h3 class="empty-heading">{{ noProgressLabel$() }}</h3>
          </div>
          <p
            class="empty-description"
            :style="{ color: 'var(--tokens-annotation)' }"
          >
            {{ hasntStartedUnitsLabel$({ name: learner.name }) }}
          </p>
        </div>
      </template>

      <!-- Content: one section per unit, the most recent open -->
      <AccordionContainer v-else>
        <AccordionItem
          v-for="(unitReport, index) in unitReports"
          :key="unitReport.id"
          :title="unitReport.title"
          :isOpenByDefault="index === unitReports.length - 1"
        >
          <template #content>
            <LearnerUnitReport
              :prefetchedData="unitReport.prefetchedData"
              :unitTitle="unitReport.title"
              :learner="learner"
            />
          </template>
        </AccordionItem>
      </AccordionContainer>
    </SidePanelLayout>
  </SidePanelModal>

</template>


<script>

  import { computed } from 'vue';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { learnerTestScores } from '../../utils';
  import LearnerUnitReport from './LearnerUnitReport.vue';

  export default {
    name: 'LearnerSidePanel',
    components: {
      AccordionContainer,
      AccordionItem,
      LearnerUnitReport,
      SidePanelModal,
      SidePanelLayout,
    },
    setup(props, { emit }) {
      const { learnerReportLabel$, noProgressLabel$, hasntStartedUnitsLabel$ } = coursesStrings;

      const hasAttempted = computed(() =>
        props.unitReports.some(({ prefetchedData }) =>
          learnerTestScores(prefetchedData, props.learner.id),
        ),
      );

      function closePanel() {
        emit('close');
      }

      return {
        learnerReportLabel$,
        noProgressLabel$,
        hasntStartedUnitsLabel$,
        hasAttempted,
        closePanel,
      };
    },
    props: {
      /**
       * Units to report on, in course order: `{ id, title, prefetchedData }`
       */
      unitReports: {
        type: Array,
        required: true,
      },
      learner: {
        type: Object,
        required: true,
      },
    },
  };

</script>


<style scoped>

  .learner-panel-title {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    overflow: hidden;
  }

  .learner-icon {
    width: 28px;
    height: 28px;
  }

  .learner-name {
    margin: 0;
    overflow: hidden;
    font-size: 24px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .learner-subtitle {
    margin: 4px 0 0;
    font-size: 13px;
  }

  .empty-state {
    padding: 2px 0;
  }

  .empty-heading-row {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .empty-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
  }

  .empty-heading {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }

  .empty-description {
    padding-left: 28px;
    margin: 0;
    font-size: 12px;
  }

  .stats-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid;
  }

  .stats-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .stats-value {
    font-size: 13px;
    font-weight: 500;
  }

</style>
