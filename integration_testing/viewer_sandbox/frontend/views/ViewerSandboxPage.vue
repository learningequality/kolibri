<template>

  <main class="sandbox">
    <h1>{{ labels.title }}</h1>
    <KGrid>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 4 }"
      >
        <KButton
          ref="selectButton"
          :text="labels.select"
          @click="openMenu"
        />
      </KGridItem>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 4 }"
      >
        <KButton
          ref="languageButton"
          :text="labels.uiLanguage"
          @click="openLanguage"
        />
      </KGridItem>
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 4 }"
      >
        <KSelect
          v-if="fixture"
          :label="labels.contentLanguage"
          :options="languageOptions"
          :value="selectedLanguageOption"
          :inline="true"
          @change="changeLanguage($event.value)"
        />
      </KGridItem>
    </KGrid>

    <KGrid v-if="fixture">
      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <section>
          <h2
            dir="auto"
            :lang="fixture.lang.id"
          >
            {{ fixture.title }}
          </h2>
          <label for="item-json">{{ labels.source }}</label>
          <textarea
            id="item-json"
            dir="ltr"
            :value="source"
            :aria-invalid="!validSource"
            :aria-describedby="!validSource ? 'item-json-error' : null"
            @input="editSource($event.target.value)"
          ></textarea>
          <p
            id="item-json-error"
            role="alert"
          >
            {{ validSource ? '' : labels.invalidSource }}
          </p>
          <h3>{{ labels.answerState }}</h3>
          <div
            v-for="(widgetId, index) in widgetIds"
            :key="widgetId"
            class="answer-row"
          >
            <label :for="`widget-answer-${index}`">{{ widgetId }}</label>
            <input
              :id="`widget-answer-${index}`"
              dir="ltr"
              :value="answerText(widgetId)"
              :aria-invalid="invalidAnswers[widgetId] || null"
              :aria-describedby="invalidAnswers[widgetId] ? `widget-answer-error-${index}` : null"
              @focus="focusedAnswer = widgetId"
              @blur="blurAnswer(widgetId)"
              @input="editAnswer(widgetId, $event.target.value)"
            >
            <span
              :id="`widget-answer-error-${index}`"
              role="status"
            >
              {{ invalidAnswers[widgetId] ? labels.invalidAnswer : '' }}
            </span>
          </div>
        </section>
      </KGridItem>

      <KGridItem
        :layout8="{ span: 4 }"
        :layout12="{ span: 6 }"
      >
        <section aria-labelledby="sandbox-preview-title">
          <h2 id="sandbox-preview-title">{{ labels.preview }}</h2>
          <KGrid>
            <KGridItem
              :layout8="{ span: 4 }"
              :layout12="{ span: 4 }"
            >
              <KCheckbox
                :checked="interactive"
                :label="labels.interactive"
                @change="interactive = !interactive"
              />
            </KGridItem>
            <KGridItem
              :layout8="{ span: 4 }"
              :layout12="{ span: 4 }"
            >
              <KCheckbox
                :checked="showAnswer"
                :label="labels.showAnswer"
                @change="toggleShowAnswer"
              />
            </KGridItem>
            <KGridItem
              :layout8="{ span: 4 }"
              :layout12="{ span: 4 }"
            >
              <KButton
                v-if="viewer && viewer.totalHints > 0"
                :text="viewer.availableHints ? labels.hint(viewer.availableHints) : labels.noHints"
                :disabled="!result || !viewer.availableHints"
                @click="viewer.takeHint()"
              />
            </KGridItem>
          </KGrid>
          <p role="status">{{ unavailable ? labels.unavailable : '' }}</p>
          <div
            :lang="contentNode.lang.id"
            :dir="contentNode.lang.lang_direction"
          >
            <ContentViewer
              :key="viewerKey"
              ref="viewer"
              :contentNode="contentNode"
              :preset="definition.preset"
              :itemData="itemData"
              :interactive="interactive"
              :showCorrectAnswer="showAnswer"
              :answerState="answerState"
              @error="viewerFailed = true"
              @answerUnavailable="unavailable = true"
              @startTracking="refreshAnswer"
              @interaction="scheduleAnswerRefresh"
              @hintTaken="refreshAnswer"
            />
          </div>
          <p role="status">
            {{ result ? (result.correct ? labels.correct : labels.incorrect) : '' }}
          </p>
        </section>
      </KGridItem>
    </KGrid>

    <SidePanelModal
      v-if="menuOpen"
      alignment="left"
      @closePanel="closeMenu"
    >
      <SidePanelLayout
        :title="labels.select"
        :closePanel="closeMenu"
        @keydown.shift.tab.native="wrapReverseTab"
      >
        <AccordionContainer multiple>
          <AccordionItem
            v-for="group in groups"
            :key="group.id"
            :title="group.title"
          >
            <template #content>
              <AccordionContainer multiple>
                <AccordionItem
                  v-for="(items, category) in group.categories"
                  :key="category"
                  :title="category"
                >
                  <template #content>
                    <ul class="fixture-list">
                      <li
                        v-for="item in items"
                        :key="item.id"
                      >
                        <KButton @click="selectItem(group.id, item.id)">
                          <bdi :lang="item.lang.id">{{ item.title }}</bdi>
                        </KButton>
                      </li>
                    </ul>
                  </template>
                </AccordionItem>
              </AccordionContainer>
            </template>
          </AccordionItem>
        </AccordionContainer>
      </SidePanelLayout>
    </SidePanelModal>
    <LanguageSwitcherModal
      v-if="languageOpen"
      @cancel="languageOpen = false"
    />
  </main>

</template>


<script>

  import {
    computed,
    getCurrentInstance,
    nextTick,
    onBeforeUnmount,
    ref,
    shallowRef,
    watch,
  } from 'vue';
  import { availableLanguages } from 'kolibri/utils/i18n';
  import usePageTitle from 'kolibri/composables/usePageTitle';
  import LanguageSwitcherModal from 'kolibri/components/language-switcher/LanguageSwitcherModal';
  import SidePanelModal from 'kolibri-common/components/courses/sidePanel/SidePanelModal';
  import SidePanelLayout from 'kolibri-common/components/courses/sidePanel/SidePanelLayout';
  import AccordionContainer from 'kolibri-common/components/accordion/AccordionContainer';
  import AccordionItem from 'kolibri-common/components/accordion/AccordionItem';
  import {
    getFirstFocusableElement,
    getLastFocusableElement,
  } from 'kolibri-common/utils/focusUtils';
  import definitions, { labels } from '../viewers';

  const groups = definitions.map(definition => ({
    id: definition.id,
    title: definition.title,
    categories: definition.fixtures.reduce((categories, fixture) => {
      (categories[fixture.category] ||= []).push(fixture);
      return categories;
    }, {}),
  }));

  function parseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }

  function sameJson(parsed, text) {
    return parsed !== undefined && JSON.stringify(parsed) === JSON.stringify(parseJson(text));
  }

  function wrapReverseTab(event) {
    const panel = event.currentTarget;
    if (event.target === getFirstFocusableElement(panel)) {
      event.preventDefault();
      getLastFocusableElement(panel)?.focus();
    }
  }

  export default {
    name: 'ViewerSandboxPage',
    components: {
      SidePanelModal,
      SidePanelLayout,
      AccordionContainer,
      AccordionItem,
      LanguageSwitcherModal,
    },
    setup() {
      usePageTitle(labels.title, { hasVisibleHeading: true });
      const { proxy } = getCurrentInstance();
      const route = computed(() => proxy.$route);
      const definition = computed(() =>
        definitions.find(({ id }) => id === route.value.params.viewerId),
      );
      const fixture = computed(() =>
        definition.value?.fixtures.find(({ id }) => id === route.value.params.itemId),
      );
      const languages = computed(() => {
        const fixtureLanguages = definitions.flatMap(viewer =>
          viewer.fixtures.map(item => item.lang),
        );
        return {
          ...Object.fromEntries(fixtureLanguages.map(lang => [lang.id, lang])),
          ...availableLanguages,
        };
      });
      const languageOptions = computed(() =>
        Object.values(languages.value).map(lang => ({
          label: `${lang.lang_name} (${lang.id})`,
          value: lang.id,
        })),
      );
      const selectedLanguage = computed(() => {
        const id = route.value.query.contentLang;
        return languages.value[id]?.id || fixture.value?.lang.id;
      });
      const selectedLanguageOption = computed(() =>
        languageOptions.value.find(option => option.value === selectedLanguage.value),
      );
      const contentNode = computed(() => ({
        files: [],
        lang: languages.value[selectedLanguage.value],
      }));
      const menuOpen = ref(false);
      const languageOpen = ref(false);
      const selectButton = ref(null);
      const languageButton = ref(null);
      const interactive = ref(true);
      const showAnswer = ref(false);
      const unavailable = ref(false);
      const viewerFailed = ref(false);
      const viewer = shallowRef(null);
      const revision = ref(0);
      const edits = new Map();
      const source = ref('');
      const validText = ref('');
      const validSource = computed(
        () => !viewerFailed.value && sameJson(parseJson(source.value), validText.value),
      );
      const packageFiles = shallowRef({});
      const result = shallowRef(null);
      const drafts = ref({});
      const focusedAnswer = ref(null);
      const invalidAnswers = ref({});
      const answerState = shallowRef({});
      const answers = computed(() => definition.value?.readAnswers(result.value) || {});
      const widgetIds = computed(
        () => definition.value?.widgetIds(parseJson(validText.value)) || [],
      );
      const itemData = computed(
        () =>
          fixture.value &&
          definition.value.itemData(fixture.value, validText.value, packageFiles.value),
      );
      const itemKey = computed(() => JSON.stringify([definition.value?.id, fixture.value?.id]));
      const viewerKeyInputs = [itemKey, revision, selectedLanguage, interactive];
      const viewerKey = computed(() => JSON.stringify(viewerKeyInputs.map(input => input.value)));

      function releasePackage() {
        Object.values(packageFiles.value).forEach(url => URL.revokeObjectURL(url));
      }

      watch(
        fixture,
        item => {
          releasePackage();
          packageFiles.value = item ? definition.value.createPackageFiles(item.files) : {};
          const edited = item && edits.get(item);
          source.value = edited?.text ?? item?.item ?? '';
          validText.value = edited?.validText ?? item?.item ?? '';
        },
        { immediate: true },
      );

      function clearAnswers() {
        result.value = null;
        drafts.value = {};
        invalidAnswers.value = {};
        answerState.value = {};
      }

      watch(viewerKeyInputs, ([item, version], [previousItem, previousVersion]) => {
        const focused = document.activeElement;
        nextTick(() => {
          if (!focused.isConnected) selectButton.value?.$el.focus();
        });
        if (item === previousItem && version === previousVersion) {
          const attempt = viewer.value?.checkAnswer()?.answerState;
          if (attempt) {
            answerState.value = definition.value.remountState(attempt, showAnswer.value);
          }
          result.value = null;
        } else {
          clearAnswers();
        }
        unavailable.value = false;
        viewerFailed.value = false;
      });

      let answerRefreshTimer;
      onBeforeUnmount(() => {
        clearTimeout(answerRefreshTimer);
        releasePackage();
      });

      function scheduleAnswerRefresh() {
        clearTimeout(answerRefreshTimer);
        const currentViewer = viewer.value;
        answerRefreshTimer = setTimeout(() => {
          if (viewer.value === currentViewer) refreshAnswer();
        }, 0);
      }

      function refreshAnswer() {
        result.value = viewer.value?.checkAnswer();
        const focused = focusedAnswer.value;
        drafts.value = focused in drafts.value ? { [focused]: drafts.value[focused] } : {};
        invalidAnswers.value =
          focused in invalidAnswers.value ? { [focused]: invalidAnswers.value[focused] } : {};
      }

      function editSource(text) {
        source.value = text;
        const parsed = parseJson(text);
        const isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
        if (isObject && (viewerFailed.value || !sameJson(parsed, validText.value))) {
          clearAnswers();
          unavailable.value = false;
          validText.value = text;
          if (viewerFailed.value) revision.value += 1;
        }
        edits.set(fixture.value, { text, validText: validText.value });
      }

      function blurAnswer(widgetId) {
        focusedAnswer.value = null;
        if (!invalidAnswers.value[widgetId]) {
          const remaining = { ...drafts.value };
          delete remaining[widgetId];
          drafts.value = remaining;
        }
      }

      function answerText(widgetId) {
        return drafts.value[widgetId] ?? JSON.stringify(answers.value[widgetId]) ?? '';
      }

      function editAnswer(widgetId, text) {
        drafts.value = { ...drafts.value, [widgetId]: text };
        const parsed = parseJson(text);
        const valid = definition.value.validAnswer(parseJson(validText.value), widgetId, parsed);
        invalidAnswers.value = { ...invalidAnswers.value, [widgetId]: !valid };
        if (valid) {
          const responses = showAnswer.value
            ? definition.value.readAnswers(viewer.value?.checkAnswer())
            : {};
          showAnswer.value = false;
          unavailable.value = false;
          answerState.value = definition.value.answerState({ ...responses, [widgetId]: parsed });
        }
      }

      function toggleShowAnswer() {
        clearAnswers();
        showAnswer.value = !showAnswer.value;
        unavailable.value = false;
      }

      function openMenu() {
        selectButton.value?.$el.focus();
        menuOpen.value = true;
      }

      function closeMenu() {
        menuOpen.value = false;
      }

      function openLanguage() {
        languageButton.value?.$el.focus();
        languageOpen.value = true;
      }

      function selectItem(viewerId, itemId) {
        if (definition.value?.id !== viewerId || fixture.value?.id !== itemId) {
          proxy.$router.push({
            name: 'VIEWER_SANDBOX',
            params: { viewerId, itemId },
            query: route.value.query,
          });
        }
        closeMenu();
      }

      function changeLanguage(id) {
        if (selectedLanguage.value === id) return;
        proxy.$router.push({ query: { ...route.value.query, contentLang: id } });
      }

      return {
        labels,
        groups,
        definition,
        fixture,
        languageOptions,
        selectedLanguageOption,
        contentNode,
        menuOpen,
        openMenu,
        languageOpen,
        selectButton,
        languageButton,
        interactive,
        showAnswer,
        unavailable,
        viewerFailed,
        viewer,
        source,
        validSource,
        result,
        answerText,
        focusedAnswer,
        blurAnswer,
        invalidAnswers,
        answerState,
        widgetIds,
        itemData,
        viewerKey,
        refreshAnswer,
        scheduleAnswerRefresh,
        editSource,
        editAnswer,
        toggleShowAnswer,
        closeMenu,
        wrapReverseTab,
        openLanguage,
        selectItem,
        changeLanguage,
      };
    },
  };

</script>


<style lang="scss" scoped>

  .sandbox {
    padding: 1rem;
  }

  textarea,
  input {
    box-sizing: border-box;
    width: 100%;
    padding: 0.5rem;
    font-family: monospace;
    color: var(--tokens-text);
    background-color: var(--tokens-surface);
  }

  textarea {
    min-height: 16rem;
    resize: vertical;
  }

  .answer-row {
    margin-bottom: 0.5rem;
  }

  .fixture-list {
    padding: 0;
    list-style: none;
  }

</style>
