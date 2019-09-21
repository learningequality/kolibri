<template>

  <PageTemplate :completed="false">

    <PageSection>
      <h3>Code Example</h3>
      <VueExample :code="ExampleCode">
        <Example />
      </VueExample>

      <h3>Guidelines</h3>

      <p>
        Simple modals break the user’s attention away from the main UI in order to
        focus attention on a singular action or task. They can contain alerts
        about important information and allow the user to edit data.
      </p>


      <h3>Accessibility</h3>
      <p>
        Modals should be keyboard accessible for users who use assistive
        technology
      </p>
      <p>
        Tabbing should limit the user to the options within a modal only and not
        extend to the UI beneath it
      </p>

      <h3>URL behavior</h3>
      <p>
        Simple modals should not have a URL (i.e. if user refreshes page, or
        uses "back" in browser, it returns them to the page below the modal)
      </p>

      <h3>Dismissing modals</h3>
      <p>
        Modals can be dismissed in 2 ways: through a "cancel/close" button
        within the modal or pressing ESC
      </p>
      <p>
        Modals are never dismissible by clicking the backdrop
      </p>

      <h3>Error states</h3>
      <p>
        See modal slots below
      </p>

      <h3>Internationalization</h3>
      <p>
        If a button group happens to exceed the width of a modal, the buttons
        should wrap, with the secondary action appearing below the primary
        action. Buttons should still right-align.
      </p>

      <h3>Layout</h3>
      <p>
        Modals have 3 sections that are always present: title, content, and
        actions
      </p>
      <p>Optional:</p>
      <ul>
        <li>Text prop below title</li>
        <li>Secondary button</li>
      </ul>

      <h4>Title</h4>
      <p>
        Keep this short, concise, and easy for the user to understand. Should
        not be structured as a sentence or question
      </p>

      <h4>Content</h4>
      <p>
        Along with text, the following UI elements are allowed in the content
        section of a modal:
      </p>
      <ul>
        <li>Text field</li>
        <li>Checkboxes</li>
        <li>Radio</li>
        <li>Select dropdown</li>
        <li>List with vertical scrollbar</li>
      </ul>

      <h4>Actions</h4>
      <p>
        There is always a raised action button present at the bottom right.
        Should always be affirmative (i.e. will save data or continue user to
        the next step).
      </p>
      <p>
        If there is a need for a secondary action, use a flat secondary button
        that is placed to the left of the action button. Secondary actions
        should always be dismissive (i.e. does not save any altered data, or
        cancels a next step).
      </p>
      <p>
        The button group should be right-aligned
      </p>

      <h4>Do not</h4>
      <ul>
        <li>
          Use buttons or other actions in the content section. If it's needed,
          the UX may need to be changed.
        </li>
        <li>
          Present unclear or ambiguous actions. Actions should be directly
          related to the title and content in the modal.
        </li>
        <li>
          Use an 'X' button. Avoid creating redundant actions.
        </li>
        <li>
          Use a back button
        </li>
        <li>
          Insert a table within a simple modal
        </li>
        <li>
          Introduce a horizontal scrollbar
        </li>
      </ul>

      <h4>Style</h4>
      <p>
        Generally, modals should be of two sizes to accommodate varied screen
        sizes:
      </p>
      <ul>
        <li>
          Mobile (from 0 to 480px):
          <ul>
            <li>Width: 80%</li>
            <li>Max width: 336px</li>
            <li>Max height: 80% of browser height</li>
          </ul>
        </li>
        <li>
          Tablet/desktop
          <ul>
            <li>Fixed width: 448px</li>
            <li>Max height: 60% of browser height</li>
          </ul>
        </li>
      </ul>
      <p>
        Scrim should be rgba(0,0,0,0.7).
      </p>
      <p>
        If there are cases that a simple modal should be increased in width,
        follow material’s guide: increment by 56px
      </p>

      <h4>Scrolling</h4>
      <p>
        If a modal happens to have a content section that expands beyond the max
        height, enable vertical scrolling. See code example below for
        implementation details and style.
      </p>
      <p>
        There should never be horizontal scrolling inside a modal
      </p>
    </PageSection>
  </PageTemplate>

</template>


<script>

  /* eslint-disable import/no-duplicates */
  import PageTemplate from '../../common/PageTemplate';
  import PageSection from '../../common/PageSection';
  import VueExample from '../../common/VueExample';
  import Example from './Example.vue';
  import ExampleCode from '!!raw-loader!./Example.vue';
  /* eslint-enable import/no-duplicates */

  export default {
    name: 'KModal',
    components: {
      PageTemplate,
      PageSection,
      VueExample,
      Example,
    },
    data() {
      return {
        ExampleCode,
      };
    },
  };

</script>


<style lang="scss" scoped></style>
