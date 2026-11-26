import kolibri from 'kolibri';
import RealContentViewer from 'kolibri/components/internal/ContentViewer';
import VueRouter from 'vue-router';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/vue';
import { selectKSelectOption } from 'testUtils'; // eslint-disable-line
import { availableLanguages, defaultLanguage } from 'kolibri/utils/i18n';
import { coreString } from 'kolibri/uiText/commonCoreStrings';
import PerseusRenderer from '../../../../../kolibri/plugins/perseus_viewer/frontend/views/PerseusRendererIndex.vue';
import definitions, { labels } from '../../viewers';
import routes from '../../routes';
import ViewerSandboxPage from '../ViewerSandboxPage.vue';

jest.mock('kolibri-plugin-data', () => ({
  __esModule: true,
  default: {
    urls: {
      __staticUrl: '/static/',
      __zipContentUrl: '/zipcontent/',
      __zipContentOrigin: 'http://localhost',
      __zipContentPort: '8000',
      prefix: '/',
      urls: {},
    },
  },
}));

URL.createObjectURL ||= () => 'blob:sandbox-fixture';
URL.revokeObjectURL ||= () => {};

const [perseus] = definitions;
const fixture = perseus.fixtures.find(item => !Object.keys(item.files).length);

async function setup(params = {}, realViewer = false) {
  let viewer;
  let result = null;
  const ContentViewer = {
    props: ['itemData', 'preset', 'contentNode', 'interactive', 'showCorrectAnswer', 'answerState'],
    data: () => ({ totalHints: 1, availableHints: 1 }),
    mounted() {
      viewer = this;
    },
    methods: { checkAnswer: () => result },
    template: '<div tabindex="0" />',
  };
  const router = new VueRouter({ routes, mode: 'abstract' });
  await router.push({ name: 'VIEWER_SANDBOX', ...params });
  render(ViewerSandboxPage, {
    routes: router,
    // eslint-disable-next-line kolibri/tests-no-stubs
    stubs: { ContentViewer: realViewer ? RealContentViewer : ContentViewer },
  });
  return {
    router,
    viewer: () => viewer,
    setResult: value => {
      result = value;
    },
    interact: value => {
      viewer.$emit('interaction');
      result = value;
    },
  };
}

function button(name, scope = screen) {
  return scope.getByRole('button', { name });
}

async function selectContentLanguage(id) {
  const lang = availableLanguages[id] || perseus.fixtures.find(item => item.lang.id === id).lang;
  await selectKSelectOption(labels.contentLanguage, `${lang.lang_name} (${lang.id})`);
}

function openFixture() {
  return setup({ params: { viewerId: perseus.id, itemId: fixture.id } });
}

describe('Viewer sandbox', () => {
  it('redirects an unmatched URL to the item picker', async () => {
    const router = new VueRouter({ routes, mode: 'abstract' });
    await router.push('/perseus/item/extra');
    expect(router.currentRoute.name).toBe('VIEWER_SANDBOX');
    expect(router.currentRoute.path).toBe('/');
  });

  it('opens the menu from the trigger when another control has focus', async () => {
    await openFixture();
    screen.getByRole('textbox', { name: labels.source }).focus();
    const trigger = button(labels.select);
    const focus = jest.spyOn(trigger, 'focus');
    await fireEvent.click(trigger);
    expect(focus).toHaveBeenCalled();
    focus.mockRestore();
  });

  it('titles the browser tab and marks the fixture title with its content language', async () => {
    const localizedFixture = perseus.fixtures.find(item => item.lang.id !== defaultLanguage.id);
    await setup({ params: { viewerId: perseus.id, itemId: localizedFixture.id } });
    await waitFor(() => expect(document.title).toMatch(new RegExp(`^${labels.title} - `)));
    expect(screen.getByRole('heading', { name: localizedFixture.title })).toHaveAttribute(
      'lang',
      localizedFixture.lang.id,
    );
  });

  it('opens the UI language dialog', async () => {
    await setup();
    await fireEvent.click(button(labels.uiLanguage));
    expect(screen.getByRole('dialog', { name: coreString('changeLanguageOption') })).toBeVisible();
  });

  it('returns focus to the UI language trigger when its dialog is cancelled', async () => {
    await openFixture();
    screen.getByRole('textbox', { name: labels.source }).focus();
    await fireEvent.click(button(labels.uiLanguage));
    const dialog = screen.getByRole('dialog', { name: coreString('changeLanguageOption') });
    await fireEvent.click(button(coreString('cancelAction'), within(dialog)));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(button(labels.uiLanguage)).toHaveFocus();
  });

  it('moves focus to the item picker when navigation removes the focused answer editor', async () => {
    const { router } = await openFixture();
    const [widgetId] = perseus.widgetIds(JSON.parse(fixture.item));
    screen.getByRole('textbox', { name: widgetId }).focus();
    await router.push({ name: 'VIEWER_SANDBOX' });
    await waitFor(() => expect(button(labels.select)).toHaveFocus());
  });

  it('groups fixtures under Perseus and their categories', async () => {
    const { viewer } = await setup();
    await fireEvent.click(button(labels.select));
    const menu = within(screen.getByRole('dialog', { name: labels.select }));
    await fireEvent.click(button(perseus.title, menu));
    for (const item of perseus.fixtures) {
      const category = button(item.category, menu);
      await fireEvent.click(category);
      const panel = document.getElementById(category.getAttribute('aria-controls'));
      expect(button(item.title, within(panel))).toBeEnabled();
    }
    await fireEvent.click(button(fixture.title, menu));
    expect(viewer().itemData.perseusItemString).toBe(fixture.item);
    expect(viewer().preset).toBe('exercise');
  });

  it('wraps reverse tab from Close to the last expanded item control', async () => {
    await setup();
    await fireEvent.click(button(labels.select));
    const dialog = screen.getByRole('dialog', { name: labels.select });
    const menu = within(dialog);
    await fireEvent.click(button(perseus.title, menu));
    const close = button(coreString('closeAction'), menu);
    const last = button(perseus.fixtures[perseus.fixtures.length - 1].category, menu);
    for (const control of [close, last]) {
      Object.defineProperty(control, 'offsetParent', { value: dialog });
    }
    close.focus();
    await fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
    expect(last).toHaveFocus();
  });

  it('keeps the preview during invalid edits and remounts it after an error', async () => {
    const { viewer } = await openFixture();
    const original = viewer();
    const editor = screen.getByRole('textbox', { name: labels.source });
    expect(editor).toHaveAttribute('dir', 'ltr');
    const valid = JSON.stringify({ ...JSON.parse(fixture.item), extra: true });

    await fireEvent.update(editor, valid);
    expect(viewer()).toBe(original);
    expect(original.itemData.perseusItemString).toBe(valid);
    for (const invalid of ['{', '[]']) {
      await fireEvent.update(editor, invalid);
      expect(viewer()).toBe(original);
      expect(viewer().itemData.perseusItemString).toBe(valid);
      expect(screen.getByRole('alert')).toHaveTextContent(labels.invalidSource);
    }
    const [widgetId] = perseus.widgetIds(JSON.parse(valid));
    expect(screen.getByRole('textbox', { name: widgetId })).toBeInTheDocument();
    original.$emit('error');
    await fireEvent.update(editor, fixture.item);
    expect(viewer()).not.toBe(original);
    expect(viewer().itemData.perseusItemString).toBe(fixture.item);
  });

  it('reads content language from the route and remounts on picker changes', async () => {
    const localizedFixture = perseus.fixtures.find(item => item.lang.id !== defaultLanguage.id);
    const { viewer, router } = await setup({
      params: { viewerId: perseus.id, itemId: localizedFixture.id },
      query: { contentLang: defaultLanguage.id },
    });
    const original = viewer();
    expect(original.contentNode.lang.id).toBe(defaultLanguage.id);
    await selectContentLanguage(localizedFixture.lang.id);
    expect(viewer()).not.toBe(original);
    expect(viewer().contentNode.lang.id).toBe(localizedFixture.lang.id);
    expect(router.currentRoute.query.contentLang).toBe(localizedFixture.lang.id);
    expect(viewer().$el.parentElement).toHaveAttribute('lang', localizedFixture.lang.id);

    await fireEvent.click(button(labels.select));
    const menu = within(screen.getByRole('dialog', { name: labels.select }));
    await fireEvent.click(button(perseus.title, menu));
    const other = perseus.fixtures.find(item => item.lang.id !== localizedFixture.lang.id);
    await fireEvent.click(button(other.category, menu));
    await fireEvent.click(button(other.title, menu));
    expect(viewer().contentNode.lang.id).toBe(localizedFixture.lang.id);
  });

  it('returns focus to the item picker when Back remounts the preview', async () => {
    const { router, viewer } = await openFixture();
    const localized = perseus.fixtures.find(item => item.lang.id !== fixture.lang.id);
    await selectContentLanguage(localized.lang.id);
    const control = viewer().$el;
    expect(control.parentElement).toHaveAttribute('lang', localized.lang.id);
    control.focus();
    expect(control).toHaveFocus();

    router.back();
    await waitFor(() => expect(button(labels.select)).toHaveFocus());
    expect(control).not.toBeInTheDocument();
  });

  describe('with Perseus', () => {
    const widgetId = 'grapher 1';
    const answer = {
      type: 'absolute_value',
      coords: [
        [-1, -1],
        [0, 7],
      ],
    };

    beforeEach(() => {
      const renderer = {
        ...PerseusRenderer,
        contentModule: { loadDirectionalCSS: () => Promise.resolve() },
      };
      jest
        .spyOn(kolibri, 'presetViewerComponent')
        .mockImplementation(preset => (preset === perseus.preset ? renderer : null));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    function mountFixture() {
      return setup({ params: { viewerId: perseus.id, itemId: fixture.id } }, true);
    }

    const previewTimeout = { timeout: 10000 };

    function previewControls() {
      return within(screen.getByRole('region', { name: labels.preview }));
    }

    it('reveals a hint and shows the correct graph', async () => {
      await mountFixture();
      const preview = previewControls();
      const hint = await preview.findByRole('button', { name: labels.hint(3) }, previewTimeout);
      await waitFor(() => expect(hint).toBeEnabled(), previewTimeout);
      await fireEvent.click(hint);
      expect(hint).toHaveAccessibleName(labels.hint(2));

      const outcome = preview.getAllByRole('status').at(-1);
      expect(outcome).toHaveTextContent(labels.incorrect);
      await fireEvent.click(preview.getByRole('checkbox', { name: labels.showAnswer }));
      await waitFor(() => expect(outcome.textContent.trim()).toBe(labels.correct), previewTimeout);
    }, 30000);

    it.each(['invalid JSON', 'whitespace'])(
      'keeps the applied graph after editing %s',
      async edit => {
        await mountFixture();
        const preview = previewControls();
        const hint = await preview.findByRole('button', { name: labels.hint(3) }, previewTimeout);
        await waitFor(() => expect(hint).toBeEnabled(), previewTimeout);
        const outcome = preview.getAllByRole('status').at(-1);
        const answerEditor = screen.getByRole('textbox', { name: widgetId });
        await fireEvent.update(answerEditor, JSON.stringify(answer));
        await waitFor(
          () => expect(outcome.textContent.trim()).toBe(labels.correct),
          previewTimeout,
        );

        const editor = screen.getByRole('textbox', { name: labels.source });
        if (edit === 'invalid JSON') {
          await fireEvent.update(editor, '{');
          await fireEvent.update(editor, fixture.item);
        } else {
          await fireEvent.update(editor, `${fixture.item}\n `);
        }
        expect(editor).not.toBeInvalid();
        expect(outcome.textContent.trim()).toBe(labels.correct);
        expect(JSON.parse(answerEditor.value)).toEqual(answer);
      },
      30000,
    );
  });

  it('marks the source invalid when the viewer cannot render it', async () => {
    const { viewer } = await openFixture();
    const editor = screen.getByRole('textbox', { name: labels.source });
    const unrenderable = JSON.stringify({ question: 5 });
    await fireEvent.update(editor, unrenderable);
    viewer().$emit('error');
    await waitFor(() => expect(editor).toBeInvalid());
    expect(screen.getByRole('alert')).toHaveTextContent(labels.invalidSource);
    expect(editor).toHaveAccessibleDescription(labels.invalidSource);
    await fireEvent.update(editor, fixture.item);
    expect(editor).not.toBeInvalid();
    expect(viewer().itemData.perseusItemString).toBe(fixture.item);
  });

  it('remounts for interactive changes and reports when the solution is unavailable', async () => {
    const { viewer } = await openFixture();
    const original = viewer();
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.interactive }));
    const current = viewer();
    expect(current).not.toBe(original);
    expect(current.itemData.emitProgrammaticInteractions).toBe(true);
    expect(current.interactive).toBe(false);
    expect(button(labels.hint(1))).toBeDisabled();
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.showAnswer }));
    expect(viewer()).toBe(current);
    expect(current.showCorrectAnswer).toBe(true);
    current.$emit('answerUnavailable');
    await fireEvent.update(screen.getByRole('textbox', { name: labels.source }), '{');
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .some(status => status.textContent.trim() === labels.unavailable),
      ).toBe(true),
    );
  });

  it('keeps the current attempt when changing interactivity and content language', async () => {
    const dropdown = perseus.fixtures.find(item => item.category === 'Dropdown');
    const { viewer, setResult } = await setup({
      params: { viewerId: perseus.id, itemId: dropdown.id },
    });
    const [id] = Object.keys(JSON.parse(dropdown.item).question.widgets);
    const answerState = { userInput: { [id]: { value: 1 } }, hintsVisible: 1 };
    setResult({ answerState });
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.interactive }));
    expect(viewer().answerState).toEqual(answerState);
    const latestAnswerState = { userInput: { [id]: { value: 2 } }, hintsVisible: 1 };
    setResult({ answerState: latestAnswerState });
    const otherLanguage = perseus.fixtures.find(item => item.lang.id !== dropdown.lang.id).lang.id;
    await selectContentLanguage(otherLanguage);
    expect(viewer().answerState).toEqual(latestAnswerState);
  });

  it('keeps hints without restoring shown answers when interactivity changes', async () => {
    const { viewer, setResult } = await openFixture();
    const [id] = Object.keys(JSON.parse(fixture.item).question.widgets);
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.showAnswer }));
    setResult({ answerState: { userInput: { [id]: { value: 1 } }, hintsVisible: 1 } });
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.interactive }));
    expect(viewer().answerState).toEqual({ hintsVisible: 1 });
    expect(viewer().showCorrectAnswer).toBe(true);
  });

  it('replaces a typed answer with the solution and then a blank response', async () => {
    const inputNumber = perseus.fixtures.find(item => item.category === 'Input number');
    const { viewer, interact } = await setup({
      params: { viewerId: perseus.id, itemId: inputNumber.id },
    });
    const [id] = perseus.widgetIds(JSON.parse(inputNumber.item));
    const answerEditor = screen.getByRole('textbox', { name: id });
    await fireEvent.update(answerEditor, '{"currentValue":"5"}');
    expect(viewer().answerState.userInput).toEqual({ [id]: { currentValue: '5' } });
    await fireEvent.blur(answerEditor);
    const showAnswer = screen.getByRole('checkbox', { name: labels.showAnswer });
    await fireEvent.click(showAnswer);
    expect(viewer().showCorrectAnswer).toBe(true);
    expect(viewer().answerState).toEqual({});
    expect(answerEditor).toHaveValue('');
    interact({ correct: true, answerState: { userInput: { [id]: { currentValue: '3' } } } });
    await waitFor(() => expect(answerEditor).toHaveValue('{"currentValue":"3"}'));
    await fireEvent.click(showAnswer);
    expect(viewer().showCorrectAnswer).toBe(false);
    expect(viewer().answerState).toEqual({});
    expect(answerEditor).toHaveValue('');
  });

  it('exposes a response editor for a widget in a table caption', async () => {
    await openFixture();
    const item = JSON.parse(fixture.item);
    const id = 'radio 1';
    item.question.widgets[id] = { type: 'radio' };
    item.question.content = `|| [[☃ ${id}]] ||\nA | B\n--- | ---\n1 | 2\n`;
    await fireEvent.update(
      screen.getByRole('textbox', { name: labels.source }),
      JSON.stringify(item),
    );
    expect(screen.getByRole('textbox', { name: id })).toBeEnabled();
  });

  it('limits answer rows to rendered widgets and applies one edit at a time', async () => {
    const dropdown = perseus.fixtures.find(item => item.category === 'Dropdown');
    const { viewer } = await setup({ params: { viewerId: perseus.id, itemId: dropdown.id } });
    const item = JSON.parse(dropdown.item);
    const [first, second] = Object.keys(item.question.widgets).filter(id =>
      id.startsWith('dropdown'),
    );
    const imageId = Object.keys(item.question.widgets).find(id => id.startsWith('image'));
    expect(screen.queryByRole('textbox', { name: imageId })).not.toBeInTheDocument();
    const editor = screen.getByRole('textbox', { name: first });
    await fireEvent.update(editor, '{"value":"invalid"}');
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    await fireEvent.update(screen.getByRole('textbox', { name: second }), '{"value":2}');
    await fireEvent.update(screen.getByRole('textbox', { name: first }), '{"value":1}');
    expect(viewer().answerState.userInput).toEqual({ [first]: { value: 1 } });
    item.question.content = item.question.content.replace(`[[☃ ${first}]]`, `\`[[☃ ${first}]]\``);
    await fireEvent.update(
      screen.getByRole('textbox', { name: labels.source }),
      JSON.stringify(item),
    );
    expect(screen.queryByRole('textbox', { name: first })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: second })).toBeInTheDocument();
  });

  it('preserves the other displayed answer when editing a solution', async () => {
    const fixture = perseus.fixtures.find(item => item.category === 'Dropdown');
    const { viewer, setResult } = await setup({
      params: { viewerId: perseus.id, itemId: fixture.id },
    });
    const [first, second] = Object.keys(JSON.parse(fixture.item).question.widgets);
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.showAnswer }));
    setResult({
      correct: true,
      answerState: {
        userInput: {
          [first]: { value: 1 },
          [second]: { value: 2 },
        },
      },
    });
    viewer().$emit('interaction');
    await fireEvent.update(screen.getByRole('textbox', { name: first }), '{"value":0}');
    expect(viewer().showCorrectAnswer).toBe(false);
    expect(viewer().answerState.userInput).toEqual({
      [first]: { value: 0 },
      [second]: { value: 2 },
    });
  });

  it('edits answers before an interaction and displays the latest answer snapshot', async () => {
    const inputNumber = perseus.fixtures.find(item => item.category === 'Input number');
    const { viewer, setResult, interact } = await setup({
      params: { viewerId: perseus.id, itemId: inputNumber.id },
    });
    const [widgetId] = Object.keys(JSON.parse(inputNumber.item).question.widgets);
    const editor = screen.getByRole('textbox', { name: widgetId });
    expect(editor).toHaveValue('');
    await fireEvent.update(editor, '[');
    expect(viewer().answerState.userInput).toBeUndefined();
    await fireEvent.update(editor, 'null');
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    await fireEvent.update(editor, '{"currentValue":"3"}');
    expect(viewer().answerState.userInput[widgetId]).toEqual({ currentValue: '3' });
    interact({
      correct: true,
      answerState: { userInput: { [widgetId]: { currentValue: '3.5' } } },
    });
    await waitFor(() =>
      expect(
        screen.getAllByRole('status').some(status => status.textContent.trim() === labels.correct),
      ).toBe(true),
    );
    expect(editor).toHaveValue('{"currentValue":"3.5"}');
    editor.focus();
    await fireEvent.update(editor, '{"currentValue":"3.50"}');
    interact({
      correct: false,
      answerState: { userInput: { [widgetId]: { currentValue: '3.5' } } },
    });
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .some(status => status.textContent.trim() === labels.incorrect),
      ).toBe(true),
    );
    expect(editor).toHaveValue('{"currentValue":"3.50"}');
    await fireEvent.blur(editor);
    expect(editor).toHaveValue('{"currentValue":"3.5"}');
    await fireEvent.click(screen.getByRole('checkbox', { name: labels.showAnswer }));
    expect(viewer().answerState.userInput).toBeUndefined();
    setResult({
      correct: false,
      answerState: { userInput: { [widgetId]: { currentValue: '0' } } },
    });
    await fireEvent.update(editor, '{"currentValue":"0"}');
    expect(viewer().showCorrectAnswer).toBe(false);
    viewer().$emit('interaction');
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('status')
          .some(status => status.textContent.trim() === labels.incorrect),
      ).toBe(true),
    );
  });

  it('replaces an invalid answer left in an editor when the preview is answered', async () => {
    const inputNumber = perseus.fixtures.find(item => item.category === 'Input number');
    const { interact } = await setup({
      params: { viewerId: perseus.id, itemId: inputNumber.id },
    });
    const [widgetId] = Object.keys(JSON.parse(inputNumber.item).question.widgets);
    const editor = screen.getByRole('textbox', { name: widgetId });
    editor.focus();
    await fireEvent.update(editor, '{"currentValue":5}');
    await fireEvent.blur(editor);
    expect(editor).toHaveAttribute('aria-invalid', 'true');
    interact({
      correct: false,
      answerState: { userInput: { [widgetId]: { currentValue: '7' } } },
    });
    await waitFor(() => expect(editor).toHaveValue('{"currentValue":"7"}'));
    expect(editor).not.toHaveAttribute('aria-invalid');
  });
});
