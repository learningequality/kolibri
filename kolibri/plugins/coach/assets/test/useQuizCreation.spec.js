import { createLocalVue, shallowMount } from '@vue/test-utils';
import { get, set } from '@vueuse/core';
import {
  rootQuiz,
  activeSection,
  useQuiz,
  useQuizSection,
} from '../src/composables/useQuizCreation.js';

describe('Initialization', () => {
  // Let's mount a component to test the composable's onMounted business
  const TestComponent = {
    setup() {
      return { rootQuiz, activeSection, ...useQuiz(), ...useQuizSection() };
    },
    template: '<span>&nbsp;</span>',
  };

  const localVue = createLocalVue();
  localVue.component({ TestComponent });

  const wrapper = shallowMount(TestComponent);

  it('Creates the initial rootQuiz object and its initial section is the selected one', () => {
    expect(get(wrapper.vm.rootQuiz)).toBeTruthy();
    expect(get(wrapper.vm.activeSection)).toBeTruthy();
  });
});

// **
// Now we should be able to test the module without any kind of components being mounted
// **

const {
  _createQuiz,
  addSection,
  deleteSection,
  saveActiveSectionChanges,
  quizSections,
  updateQuiz,
  updateQuestion,
  revertActiveSectionChanges,
  updateActiveSection,
} = useQuiz();

function resetRootQuiz() {
  set(rootQuiz, _createQuiz());
}

describe('useQuizCreation', () => {
  beforeEach(() => {
    resetRootQuiz();
  });

  describe('CRUD', () => {
    describe('rootQuiz', () => {
      it('Can update the rootQuiz object or a subset of its properties', () => {
        const title = 'New Title';
        updateQuiz({ title });
        expect(get(rootQuiz).title).toEqual(title);

        // We only update `question_sources` so be sure we don't overwrite the title
        updateQuiz({ question_sources: 'yes' });
        expect(get(rootQuiz).title).toEqual(title);
        expect(get(quizSections)).toEqual('yes');
      });

      it('Will throw an error if you update it with something not shaped like a Quiz', () => {
        expect(() => updateQuiz({ foo: 'BAR' })).toThrow(TypeError);
        expect(() => updateQuiz({ title: 'BAR', quiztion_sauces: 'wut?' })).toThrow(TypeError);
        expect(() => updateQuiz({ title: 'BAR', question_sources: [], baz: false })).toThrow(
          TypeError
        );
      });

      it('Can add a section to the quiz and set it as the selected section', () => {
        expect(get(quizSections).length).toEqual(1);
        addSection();
        expect(get(quizSections).length).toEqual(2);
        // Also, the activeSection should be set to the new section
        expect(get(activeSection)).toEqual(get(quizSections)[1]);
      });

      it('Can delete a section from the quiz', () => {
        // Add a section
        const section = addSection();
        expect(get(quizSections).length).toEqual(2);
        // Delete the section
        deleteSection(section.section_id);
        expect(get(quizSections).length).toEqual(1);
      });

      it('Will always have at least one section, so deleting the last will generate a new empty one', () => {
        const s1id = get(quizSections)[0].section_id;
        expect(get(quizSections)[0].section_id).toEqual(s1id);
        deleteSection(s1id);
        expect(get(quizSections)[0].section_id).not.toEqual(s1id);
      });

      it('Can update a section with changes made to the activeSection', () => {
        const section = get(quizSections)[0];
        expect(get(activeSection)).toEqual(section); // Be sure we're using the active section
        const { section_id } = section;
        set(activeSection, { section_id, section_title: 'New Title', question_count: 99 });
        saveActiveSectionChanges();
        expect(get(quizSections)[0].section_title).toEqual('New Title');
        expect(get(quizSections)[0].question_count).toEqual(99);
        set(activeSection, { section_id, section_title: 'New Title 2', question_count: 100 });
        // Be sure changes only reflect when saveActiveSectionChanges is called
        expect(get(quizSections)[0].section_title).toEqual('New Title');
        expect(get(quizSections)[0].question_count).toEqual(99);
      });
    });

    it('Can update any value of the active quiz section without saving it to rootQuiz', () => {
      expect(get(activeSection).section_title).toEqual(''); // Default
      updateActiveSection({ section_title: 'New Title' });
      expect(get(activeSection).section_title).toEqual('New Title');
      expect(get(rootQuiz).question_sources[0].section_title).toEqual('');
    });

    it('Can update any value of the active quiz section while saving changes to rootQuiz', () => {
      expect(get(activeSection).section_title).toEqual(''); // Default
      updateActiveSection({ section_title: 'New Title' }, true);
      expect(get(activeSection).section_title).toEqual('New Title');
      expect(get(rootQuiz).question_sources[0].section_title).toEqual('New Title');
    });

    it('Will throw an error if you update it with something not shaped like a QuizSection', () => {
      expect(() => updateActiveSection({ foo: 'BAR' })).toThrow(TypeError);
      expect(() => updateActiveSection({ section_title: 'BAR', baz: false })).toThrow(TypeError);
    });

    it('Can reset all changes to the activeSection', () => {
      updateActiveSection({ section_title: 'Old Title' });
      expect(get(rootQuiz).question_sources[0].section_title).not.toEqual('Old Title');
      saveActiveSectionChanges(); // Save the changes to rootQuiz
      expect(get(rootQuiz).question_sources[0].section_title).toEqual('Old Title');

      // Now we're in a state where our activeSection is no longer the default values
      // So we should change it, reset it, and see that rootQuiz and activeSection
      // are back to their original values
      updateActiveSection({ section_title: 'New Title' });
      expect(get(activeSection).section_title).toEqual('New Title');
      revertActiveSectionChanges();
      expect(get(rootQuiz).question_sources[0].section_title).toEqual('Old Title');
    });
  });

  it('Can rename a particular question', () => {
    updateActiveSection({
      questions: [{ question_id: 1, title: 'Old Text', counter_in_exercise: 1 }],
    });
    updateQuestion({ question_id: 1, title: 'New Text' });
    expect(get(activeSection).questions[0].title).toEqual('New Text');
    // Be sure we've also updated the rootQuiz
    expect(
      get(rootQuiz).question_sources.find(q => q.section_id === get(activeSection).section_id)
        .questions[0].title
    ).toEqual('New Text');
  });
});
