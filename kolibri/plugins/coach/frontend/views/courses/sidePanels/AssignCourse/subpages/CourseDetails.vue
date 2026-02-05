<template>

  <SidePanelLayout
    :goBack="goBack"
    :title="course ? courseNameLabel$({ name: course.title }) : ''"
    :subtitle="courseSubtitle"
  >
    <template #default>
      <section
        v-if="!loading"
        class="course-info"
      >
        <div class="course-thumbnail">
          <KImg
            v-if="course.thumbnail"
            :src="course.thumbnail"
            isDecorative
          />
        </div>
        <div
          ref="courseDescriptionRef"
          class="course-description"
          :style="{
            paddingLeft: course.thumbnail ? '16px' : '0',
            maxHeight: descExpanded ? 'unset' : '128px',
          }"
        >
          {{ course.description }}
        </div>
      </section>
      <KButton
        v-if="descOverflowing"
        style="display: block; margin-bottom: 32px; text-align: right"
        appearance="basic-link"
        primary
        :text="descExpanded ? viewLessAction$() : viewMoreAction$()"
        @click="descExpanded = !descExpanded"
      />

      <KCircularLoader v-if="loading" />
      <AccordionContainer
        v-else
        class="course-preview"
        :headerAppearanceOverrides="{
          backgroundColor: $themeTokens.surface,
          fontWeight: 'normal',
          padding: '0 0 16px 0',
          borderTop: '0px none',
        }"
        :style="{
          border: '0px none',
        }"
      >
        <template #header="{ expandAll }">
          <div class="course-content-label">
            <span>{{ courseContentLabel$() }}</span>
            <KButton
              appearance="basic-link"
              :text="expandAllUnits$()"
              @click="expandAll"
            />
          </div>
        </template>
        <AccordionItem
          v-for="unit in units"
          :key="unit.id"
          class="unit-item"
          :title="unit.title"
          :foldingIconTrailing="false"
          :headerAppearanceOverrides="{
            backgroundColor: $themePalette.grey.v_100,
            border: `1px solid ${$themeTokens.fineLine}`,
          }"
          :contentAppearanceOverrides="{
            border: `1px solid ${$themeTokens.fineLine}`,
          }"
        >
          <template #content>
            <ul
              class="resource-list"
              :style="{ backgroundColor: $themeTokens.surface }"
            >
              <li class="resource-item">
                <span>
                  <ContentIcon
                    class="content-icon"
                    :kind="ContentNodeKinds.EXAM"
                  />
                  {{ preTestLabel$() }}
                </span>
                <span>{{ numQuestions$({ num: numTestQuestions(unit) }) }}</span>
              </li>
              <li
                v-for="resource in unit?.children?.results"
                :key="resource.id"
                class="resource-item"
              >
                <span>
                  <ContentIcon
                    class="content-icon"
                    :kind="ContentNodeKinds.LESSON"
                  />
                  {{ resource.title }}
                </span>
                <span>{{ numberOfResources$({ value: resource?.on_device_resources || 0 }) }}</span>
              </li>
              <li class="resource-item">
                <span>
                  <ContentIcon
                    class="content-icon"
                    :kind="ContentNodeKinds.EXAM"
                  />
                  {{ postTestLabel$() }}
                </span>
                <span>{{ numQuestions$({ num: numTestQuestions(unit) }) }}</span>
              </li>
            </ul>
          </template>
          <template #trailing-actions>
            <span
              :style="{
                color: $themePalette.grey.v_400,
              }"
            >
              {{ numLessons$({ num: unit?.children?.results?.length }) }}
            </span>
          </template>
        </AccordionItem>
      </AccordionContainer>
    </template>
    <template #bottomNavigation>
      <div class="bottom-actions">
        <KButton
          :text="backAction$()"
          @click="goBack"
        />
        <KButton
          primary
          :text="selectRecipientsLabel$()"
          @click="selectRecipients"
        />
      </div>
    </template>
  </SidePanelLayout>

</template>


<script>

  import get from 'lodash/get';
  import { computed, ref } from 'vue';
  import { templateRef } from '@vueuse/core';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import { ContentNodeKinds } from 'kolibri/constants';
  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';
  import { coachStrings } from '../../../../../views/common/commonCoachStrings';

  export default {
    name: 'CourseDetailsSubpage',
    components: {
      AccordionContainer,
      AccordionItem,
      ContentIcon,
      SidePanelLayout,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();

      const { backAction$, viewMoreAction$, viewLessAction$ } = coreStrings;
      const {
        courseContentLabel$,
        courseNameLabel$,
        expandAllUnits$,
        numLessons$,
        numQuestions$,
        numUnits$,
        selectRecipientsLabel$,
        preTestLabel$,
        postTestLabel$,
      } = coursesStrings;

      const { numberOfResources$ } = coachStrings;

      const course = ref(null);
      const units = computed(() => course.value?.children?.results);
      const numTestQuestions = computed(() => {
        return function (unit) {
          const path = 'options.completion_criteria.threshold.pre_post_test.version_a_item_ids';
          const testQuestions = get(unit, path, []);
          return testQuestions.length;
        };
      });

      const selectRecipients = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_SELECT_RECIPIENTS,
          }),
        );
      };

      const goBack = () => {
        router.push(
          overrideRoute(route, {
            name: PageNames.COURSES_ASSIGN_INDEX,
          }),
        );
      };

      const loading = ref(true);
      ContentNodeResource.fetchTree({ id: route.params.courseId })
        .then(results => {
          course.value = results;
          loading.value = false;
        })
        .catch(() => {
          loading.value = false;
        });

      const courseSubtitle = computed(() => {
        if (loading.value) {
          return '';
        }
        const part1 = numUnits$({ num: units.value?.length });
        const message =
          part1 + ' · ' + numberOfResources$({ value: course.value?.on_device_resources });
        return message;
      });

      // Description expansion
      const descExpanded = ref(false);
      const courseDescriptionRef = templateRef('courseDescriptionRef');
      const descOverflowing = computed(() => {
        return courseDescriptionRef.value?.scrollHeight > 160;
      });

      return {
        descExpanded,
        descOverflowing,
        loading,
        goBack,
        selectRecipients,
        numTestQuestions,

        courseSubtitle,
        backAction$,
        preTestLabel$,
        postTestLabel$,
        courseContentLabel$,
        courseNameLabel$,
        expandAllUnits$,
        numQuestions$,
        selectRecipientsLabel$,
        numLessons$,
        numberOfResources$,
        viewMoreAction$,
        viewLessAction$,
        ContentNodeKinds,

        course,
        units,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .bottom-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    width: 100%;
  }

  .course-info {
    display: flex;
    width: 100%;
    margin: 8px 0;
  }

  .course-thumbnail {
    display: flex;
    min-width: 128px;
    min-height: 128px;
    max-height: 128px;
  }

  .course-description {
    overflow: hidden;
  }

  .resource-list {
    padding: 0;
    margin: 0;
    list-style-type: none;
  }

  .resource-item {
    display: flex;
    justify-content: space-between;
    padding: 8px;
  }

  .course-content-label {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
  }

  .content-icon {
    margin-right: 8px;
    font-size: 24px;
  }

  .unit-item {
    padding-left: 0;
    font-weight: normal;
    border: 0 none !important;
  }

</style>
