<template>

  <SidePanelLayout
    :goBack="goBack"
    :title="course ? courseNameLabel$({ name: course.title }) : ''"
    :subtitle="courseSubtitle"
  >
    <template #default>
      <section v-if="!loading" class="course-info">
        <KImg
          v-if="course.thumbnail"
          class="course-thumbnail"
          :src="course.thumbnail"
        />
        <div
          class="course-description"
          :style="{ paddingLeft: course.thumbnail ? '1em' : '0' }"
        >
          {{ course.description }}
        </div>
      </section>

      <KCircularLoader v-if="loading" />
      <AccordionContainer
        v-else
        class="course-preview"
        :headerAppearanceOverrides="{
          backgroundColor: $themeTokens.surface,
          fontWeight: 'normal',
          paddingLeft: '0.5em',
          borderTop: '0px none'
        }"
        :style="{
          border: '0px none'
        }"
      >
        <template #header="{ expandAll }">
          <div class='course-content-label'>
            <span>{{ courseContentLabel$() }}</span>
            <KButton
              appearance='basic-link'
              :text="expandAllUnits$()"
              @click="expandAll"
            />
          </div>
        </template>
        <AccordionItem
          v-for="(unit, i) in units"
          :key="unit.id"
          :title="unit.title"
          :foldingIconTrailing="false"
          :headerAppearanceOverrides="{
            backgroundColor: $themePalette.grey.v_100,
            fontWeight: 'normal',
            border: `1px solid ${$themeTokens.fineLine}`,
            paddingLeft: '0.5em',
            border: '0px none'
          }"
          :contentAppearanceOverrides="{
            border: `1px solid ${$themeTokens.fineLine}`,
          }"
        >
          <template #content>
            <ul class='resource-list' :style="{ backgroundColor: $themeTokens.surface }">
              <li
                v-for="resource in unit.children"
                class='resource-item'
              >
                <span>
                  <ContentIcon
                    :kind="resource.kind"
                    style="margin-right: 0.5em; font-size: 1.5em;"
                  />
                  {{ resource.title }}
                </span>
                <span>{{ coachStrings.$tr("numberOfResources", { value: resource.children?.length || 0 }) }}</span>
              </li>
            </ul>
          </template>
          <template #trailing-actions>
            <span
              :style="{
                color: $themePalette.grey.v_400
              }"
            >
            {{ numLessons$({ num: unit.children.length }) }}
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

  import { computed, ref } from 'vue';
  import { useRoute, useRouter } from 'vue-router/composables';
  import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
  import ContentIcon from 'kolibri-common/components/labels/ContentIcon';
  import ContentNodeResource from 'kolibri-common/apiResources/ContentNodeResource';
  import LessonResource from 'kolibri-common/apiResources/LessonResource';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import TimeDuration from 'kolibri-common/components/TimeDuration';
  import { coursesStrings } from 'kolibri-common/strings/coursesStrings';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import { overrideRoute } from '../../../../../utils';
  import { PageNames } from '../../../../../constants';
  import useFetchTree from '../../../../../composables/useFetchTree.js'
  import { coachStrings } from '../../../../../views/common/commonCoachStrings';


  /**
    Recursively fetches a full tree given a node ID. All data loaded eagerly here
    to give accurate preview of resources and calculations of resource counts.

    _NOTE:_ This is not ideal for almost any circumstances because it will fetch
    all pages of children if there are any. This approach is taken here with the
    probably correct assumption that Courses will not ever be enormous enough that
    we'd end up paginating much at all (in which case this is reasonably fast).

    returns the contentnode you gave the ID for, but it is normalized away from the
    fetchTree pagination (where children is { more, results }) - this gets us the
    node with all of it's children and it's children's children directly in their
    parents .children property. **which again is only an ok idea in this case
    because Courses are not intended to be so large**
    */
  async function fetchAllChildren(nodeId) {
    console.log('fetching children for ', nodeId)
    const node = await ContentNodeResource.fetchTree({ id: nodeId });
    const { results, more } = (node.children || {});
    const updated = results;

    let lastMore = more;
    // Need a loader for this eh (shouldn't be so big)
    while (Boolean(lastMore)) {
      const {
        more: moreChildren,
        results: childResults,
      } = await ContentNodeResource.fetchTree(more);
      updated.concat(childResults);
      // Run again if we still have more
      lastMore = moreChildren;
    }
    // Short-circuit if there are no children to update
    if(!updated) { return node; };
    // Otherwise, we'll normalize `children` to be an array of nodes
    node.children = [];
    for(let child of updated) {
      const newChild = await fetchAllChildren(child.id);
      node.children.push(newChild);
    }
    return node;
  }

  export default {
    name: 'CourseDetailsSubpage',
    components: {
      AccordionContainer,
      AccordionItem,
      ContentIcon,
      TimeDuration,
      SidePanelLayout,
    },
    setup() {
      const route = useRoute();
      const router = useRouter();

      const { backAction$ } = coreStrings;
      const {
        courseContentLabel$,
        courseNameLabel$,
        expandAllUnits$,
        numLessons$,
        numUnits$,
        numResources$,
        timeTotalLength$,
        selectRecipientsLabel$,
      } = coursesStrings;

      const course = ref(null);
      const units = computed(() => course.value?.children);

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
      fetchAllChildren(route.params.courseId)
        .then(results => {
          course.value = results;
          loading.value = false;
        })


      const courseSubtitle = computed(() => {
        if(loading.value == true) {
          return '';
        }
        const part1 = numUnits$({ num: units.value?.length });
        const part2 = numResources$({
          num: units.value.reduce((a,v) => a+=v.children.length, 0),
        })
        // Go through units and add up the duration of all children's children
        const duration = units.value.reduce((acc,unit) => {
          // Either add the duration or add 0 if duration is null (it can be null or int)
          const unitDuration = unit.children.reduce((a,v) => a+=(a.duration || 0), 0);
          // Now add the total duration back into the accumulator
          return acc + unitDuration;
        })
        let message = part1 + " · " + part2
        if(duration && duration > 0) {
          message += " · " + duration + " " + totalLength$();
        }
        return message
      });

      return {
        loading,
        goBack,
        selectRecipients,

        courseSubtitle,
        backAction$,
        courseContentLabel$,
        courseNameLabel$,
        expandAllUnits$,
        selectRecipientsLabel$,
        numLessons$,
        coachStrings,

        course,
        units
      };
    },
    created() {

    }
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
    max-height: 10em;
    width: 100%;
    margin: 1em 0 2em 0;
  }

  .course-thumbnail {
    width: 33%;
  }

  .course-description {
    padding-left: 1em;
  }

  .resource-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
  }
  .resource-item {
    padding: 0.5em;
    display: flex;
    justify-content: space-between;
  }
  .course-content-label {
    display: flex;
    justify-content: space-between;
    font-weight: bold;
  }

</style>
