import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import Vue, { ref } from 'vue';
import ResourceLayout from '../index.vue';

// Disable eslint rules for vue components in this test file
/* eslint-disable vue/one-component-per-file */
/* eslint-disable vue/no-unused-properties */
/* eslint-disable vue/require-prop-types */

// Mock useKResponsiveWindow
const mockBreakpoint = ref(4); // Default to desktop breakpoint (push mode)
jest.mock('kolibri-design-system/lib/composables/useKResponsiveWindow', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    windowBreakpoint: mockBreakpoint,
    windowIsSmall: { value: false },
  })),
}));

// Mock SidePanelModal to render its slot content directly for testing
jest.mock('kolibri-common/components/courses/sidePanel/SidePanelModal', () => ({
  __esModule: true,
  default: {
    name: 'SidePanelModal',
    render(h) {
      return h(
        'div',
        { attrs: { 'data-testid': 'side-panel-modal-wrapper' } },
        this.$slots.default,
      );
    },
  },
}));

function setBreakpoint(breakpoint) {
  mockBreakpoint.value = breakpoint;
}

function renderResourceLayout(slots = {}) {
  return render(ResourceLayout, { slots });
}

describe('ResourceLayout', () => {
  beforeEach(() => {
    // Reset to desktop breakpoint before each test
    setBreakpoint(4);
  });

  describe('slot rendering', () => {
    it('renders the topBar slot content inside KToolbar', () => {
      renderResourceLayout({
        topBar: '<div data-testid="top-bar-content">Top Bar</div>',
      });
      expect(screen.getByTestId('top-bar-content')).toHaveTextContent('Top Bar');
      // Should be inside the top-bar area
      expect(screen.getByTestId('top-bar')).toContainElement(screen.getByTestId('top-bar-content'));
    });

    it('renders the default slot as main content', () => {
      renderResourceLayout({
        default: '<div data-testid="main-content">Main Content</div>',
      });
      expect(screen.getByTestId('main-content')).toHaveTextContent('Main Content');
    });

    it('renders the sidePanel slot content when panel is open', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.getByTestId('side-panel-data')).toBeInTheDocument();
    });

    it('renders the bottomBar slot content', () => {
      renderResourceLayout({
        bottomBar: '<div data-testid="bottom-bar-content">Bottom Bar</div>',
      });
      expect(screen.getByTestId('bottom-bar-content')).toHaveTextContent('Bottom Bar');
    });

    it('renders the sidePanelFooter slot content when panel is open', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        sidePanelFooter: '<div data-testid="side-panel-footer-content">Footer</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.getByTestId('side-panel-footer-content')).toBeInTheDocument();
    });

    it('renders the sidePanelTopBar slot content in side panel header', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        sidePanelTopBar: '<div data-testid="side-panel-title-content">Panel Title</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.getByTestId('side-panel-title-content')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-header')).toContainElement(
        screen.getByTestId('side-panel-title-content'),
      );
    });

    it('renders all six slots together', async () => {
      renderResourceLayout({
        topBar: '<div data-testid="top-bar-content">Top</div>',
        default: '<div data-testid="main-content">Main</div>',
        sidePanel: '<div data-testid="side-panel-data">Side</div>',
        bottomBar: '<div data-testid="bottom-bar-content">Bottom</div>',
        sidePanelFooter: '<div data-testid="side-panel-footer-content">Footer</div>',
        sidePanelTopBar: '<div data-testid="side-panel-title-content">Title</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.getByTestId('top-bar-content')).toBeInTheDocument();
      expect(screen.getByTestId('main-content')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-data')).toBeInTheDocument();
      expect(screen.getByTestId('bottom-bar-content')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-footer-content')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-title-content')).toBeInTheDocument();
    });
  });

  describe('empty slot collapse', () => {
    it('does not render top-bar when no topBar slot and no side panel', () => {
      renderResourceLayout({
        default: '<div data-testid="main-content">Main</div>',
      });
      expect(screen.queryByTestId('top-bar')).not.toBeInTheDocument();
    });

    it('renders top-bar when side panel exists even without topBar slot (for toggle)', () => {
      renderResourceLayout({
        default: '<div data-testid="main-content">Main</div>',
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });
      expect(screen.getByTestId('top-bar')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-toggle')).toBeInTheDocument();
    });

    it('does not render bottom-bar-area when bottomBar slot is empty', () => {
      renderResourceLayout({
        default: '<div data-testid="main-content">Main</div>',
      });
      expect(screen.queryByTestId('bottom-bar-area')).not.toBeInTheDocument();
    });

    it('does not show toggle when sidePanel slot is empty', () => {
      renderResourceLayout({
        default: '<div data-testid="main-content">Main</div>',
      });
      expect(screen.queryByTestId('side-panel-toggle')).not.toBeInTheDocument();
    });

    it('does not render side-panel-footer when sidePanelFooter slot is empty', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.queryByTestId('side-panel-footer')).not.toBeInTheDocument();
    });
  });

  describe('toggle behavior', () => {
    it('shows toggle button when sidePanel slot has content', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });
      expect(screen.getByTestId('side-panel-toggle')).toBeInTheDocument();
    });

    it('side panel is closed by default', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });
      expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
    });

    it('clicking toggle opens the side panel', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.getByTestId('side-panel')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-data')).toBeInTheDocument();
    });

    it('clicking toggle again closes the side panel', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle')); // Open
      await fireEvent.click(screen.getByTestId('side-panel-toggle')); // Close

      expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
    });

    it('toggle button is in KToolbar when panel is closed', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      const topBar = screen.getByTestId('top-bar');
      const toggle = screen.getByTestId('side-panel-toggle');
      expect(topBar).toContainElement(toggle);
    });

    it('toggle button moves to side panel header when panel is open', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      const sidePanelHeader = screen.getByTestId('side-panel-header');
      const toggle = screen.getByTestId('side-panel-toggle');
      expect(sidePanelHeader).toContainElement(toggle);
    });
  });

  describe('non-claimable slots (topBar, sidePanelTopBar)', () => {
    it('nested ResourceLayout does NOT take over parent topBar', async () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #topBar>
              <div data-testid="parent-top-bar">Parent Top Bar</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #topBar>
                  <div data-testid="child-top-bar">Child Top Bar</div>
                </template>
                <template #default>
                  <div data-testid="child-main">Child Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      // Parent's topBar should remain (non-claimable)
      expect(screen.getByTestId('parent-top-bar')).toBeInTheDocument();
    });

    it('nested ResourceLayout does NOT take over parent sidePanelTopBar', async () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side</div>
            </template>
            <template #sidePanelTopBar>
              <div data-testid="parent-panel-title">Parent Title</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #sidePanelTopBar>
                  <div data-testid="child-panel-title">Child Title</div>
                </template>
                <template #default>
                  <div data-testid="child-main">Child Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Parent's sidePanelTopBar should remain (non-claimable)
      expect(screen.getByTestId('parent-panel-title')).toBeInTheDocument();
    });
  });

  describe('nested default slot with multiple root nodes', () => {
    it('renders multiple root nodes in nested default slot without error', () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <div data-testid="child-node-1">Child Node 1</div>
                  <div data-testid="child-node-2">Child Node 2</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      expect(screen.getByTestId('child-node-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-node-2')).toBeInTheDocument();
    });
  });

  describe('claimable slots (sidePanel, bottomBar, sidePanelFooter) - nested takeover', () => {
    it('nested ResourceLayout with sidePanel slot takes over parent side panel', async () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side Panel</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #sidePanel>
                  <div data-testid="child-side-panel">Child Side Panel</div>
                </template>
                <template #default>
                  <div data-testid="child-main">Child Main Content</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // The child's side panel content should be rendered (deepest wins)
      expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      // The parent's side panel should NOT be rendered since child took over
      expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();
    });

    it('nested ResourceLayout without sidePanel slot does not affect parent side panel', async () => {
      const ParentWithNestedChildNoSidePanel = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side Panel</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <div data-testid="child-main">Child Main Content</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChildNoSidePanel);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Parent's side panel should still be rendered since child has no sidePanel slot
      expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
    });

    it('nested ResourceLayout with bottomBar slot takes over parent bottom bar', async () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #bottomBar>
              <div data-testid="parent-bottom-bar">Parent Bottom Bar</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #bottomBar>
                  <div data-testid="child-bottom-bar">Child Bottom Bar</div>
                </template>
                <template #default>
                  <div data-testid="child-main">Child Main Content</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      // Wait for nested slot claiming to complete
      await waitFor(() => {
        expect(screen.getByTestId('child-bottom-bar')).toBeInTheDocument();
      });
      // The parent's bottom bar should NOT be rendered since child took over
      expect(screen.queryByTestId('parent-bottom-bar')).not.toBeInTheDocument();
    });

    it('nested ResourceLayout without bottomBar slot does not affect parent bottom bar', () => {
      const ParentWithNestedChildNoBottomBar = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #bottomBar>
              <div data-testid="parent-bottom-bar">Parent Bottom Bar</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <div data-testid="child-main">Child Main Content</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChildNoBottomBar);

      // Parent's bottom bar should still be rendered since child has no bottomBar slot
      expect(screen.getByTestId('parent-bottom-bar')).toBeInTheDocument();
    });

    it('nested ResourceLayout with sidePanelFooter slot takes over parent side panel footer', async () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side</div>
            </template>
            <template #sidePanelFooter>
              <div data-testid="parent-footer">Parent Footer</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #sidePanelFooter>
                  <div data-testid="child-footer">Child Footer</div>
                </template>
                <template #default>
                  <div data-testid="child-main">Child Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Child's sidePanelFooter takes over (deepest wins)
      expect(screen.getByTestId('child-footer')).toBeInTheDocument();
      expect(screen.queryByTestId('parent-footer')).not.toBeInTheDocument();
    });

    it('nested ResourceLayout without sidePanelFooter slot does not affect parent side panel footer', async () => {
      const ParentWithNestedChild = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side</div>
            </template>
            <template #sidePanelFooter>
              <div data-testid="parent-footer">Parent Footer</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <div data-testid="child-main">Child Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ParentWithNestedChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Parent's footer should still be rendered since child has no sidePanelFooter slot
      expect(screen.getByTestId('parent-footer')).toBeInTheDocument();
    });
  });

  describe('independent slot requesting', () => {
    it('child can request only side panel while parent keeps bottom bar', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side</div>
            </template>
            <template #bottomBar>
              <div data-testid="parent-bottom-bar">Parent Bottom</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #sidePanel>
                  <div data-testid="child-side-panel">Child Side</div>
                </template>
                <template #default>
                  <div>Child Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Child's side panel takes over
      expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();
      // Parent's bottom bar remains
      expect(screen.getByTestId('parent-bottom-bar')).toBeInTheDocument();
    });

    it('child can request only bottom bar while parent keeps side panel', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="parent-side-panel">Parent Side</div>
            </template>
            <template #bottomBar>
              <div data-testid="parent-bottom-bar">Parent Bottom</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #bottomBar>
                  <div data-testid="child-bottom-bar">Child Bottom</div>
                </template>
                <template #default>
                  <div>Child Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Parent's side panel remains
      expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
      // Child's bottom bar takes over
      expect(screen.getByTestId('child-bottom-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('parent-bottom-bar')).not.toBeInTheDocument();
    });
  });

  describe('multiple nesting levels (deepest wins)', () => {
    it('deepest component with sidePanel slot wins over intermediate levels', async () => {
      const ThreeLevelNesting = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="level-1-side-panel">Level 1 Side Panel</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #sidePanel>
                  <div data-testid="level-2-side-panel">Level 2 Side Panel</div>
                </template>
                <template #default>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="level-3-side-panel">Level 3 Side Panel</div>
                    </template>
                    <template #default>
                      <div data-testid="deepest-main">Deepest Main Content</div>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ThreeLevelNesting);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Only the deepest (level 3) side panel should be rendered
      expect(screen.getByTestId('level-3-side-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('level-2-side-panel')).not.toBeInTheDocument();
      expect(screen.queryByTestId('level-1-side-panel')).not.toBeInTheDocument();
    });

    it('deepest component with bottomBar slot wins over intermediate levels', async () => {
      const ThreeLevelNesting = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #bottomBar>
              <div data-testid="level-1-bottom-bar">Level 1 Bottom Bar</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #bottomBar>
                  <div data-testid="level-2-bottom-bar">Level 2 Bottom Bar</div>
                </template>
                <template #default>
                  <ResourceLayout>
                    <template #bottomBar>
                      <div data-testid="level-3-bottom-bar">Level 3 Bottom Bar</div>
                    </template>
                    <template #default>
                      <div data-testid="deepest-main">Deepest Main Content</div>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(ThreeLevelNesting);

      // Wait for nested slot claiming to complete
      await waitFor(() => {
        expect(screen.getByTestId('level-3-bottom-bar')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('level-2-bottom-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('level-1-bottom-bar')).not.toBeInTheDocument();
    });
  });

  describe('unmount cleanup', () => {
    it('when nested component unmounts, parent falls back to its own side panel content', async () => {
      const ParentWithConditionalChild = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showChild: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side Panel</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showChild">
                  <template #sidePanel>
                    <div data-testid="child-side-panel">Child Side Panel</div>
                  </template>
                  <template #default>
                    <div data-testid="child-main">Child Main Content</div>
                  </template>
                </ResourceLayout>
                <div v-else data-testid="no-child">No child</div>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-child" @click="showChild = !showChild">Toggle Child</button>
          </div>
        `,
      });

      render(ParentWithConditionalChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Initially, child's side panel should be shown
      expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();

      // Unmount the child
      await fireEvent.click(screen.getByTestId('toggle-child'));

      // After child unmounts, parent's side panel should be shown again
      expect(screen.queryByTestId('child-side-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
    });

    it('when nested component unmounts, parent falls back to its own bottom bar content', async () => {
      const ParentWithConditionalChild = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showChild: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #bottomBar>
                <div data-testid="parent-bottom-bar">Parent Bottom Bar</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showChild">
                  <template #bottomBar>
                    <div data-testid="child-bottom-bar">Child Bottom Bar</div>
                  </template>
                  <template #default>
                    <div data-testid="child-main">Child Main Content</div>
                  </template>
                </ResourceLayout>
                <div v-else data-testid="no-child">No child</div>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-child" @click="showChild = !showChild">Toggle Child</button>
          </div>
        `,
      });

      render(ParentWithConditionalChild);

      // Wait for nested slot claiming to complete
      await waitFor(() => {
        expect(screen.getByTestId('child-bottom-bar')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('parent-bottom-bar')).not.toBeInTheDocument();

      // Unmount the child
      await fireEvent.click(screen.getByTestId('toggle-child'));

      // After child unmounts, parent's bottom bar should be shown again
      await waitFor(() => {
        expect(screen.getByTestId('parent-bottom-bar')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('child-bottom-bar')).not.toBeInTheDocument();
    });

    it('when nested component unmounts, parent falls back to its own side panel footer', async () => {
      const ParentWithConditionalChild = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showChild: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side</div>
              </template>
              <template #sidePanelFooter>
                <div data-testid="parent-footer">Parent Footer</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showChild">
                  <template #sidePanelFooter>
                    <div data-testid="child-footer">Child Footer</div>
                  </template>
                  <template #default>
                    <div data-testid="child-main">Child Main Content</div>
                  </template>
                </ResourceLayout>
                <div v-else data-testid="no-child">No child</div>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-child" @click="showChild = !showChild">Toggle Child</button>
          </div>
        `,
      });

      render(ParentWithConditionalChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Initially, child's footer should be shown
      await waitFor(() => {
        expect(screen.getByTestId('child-footer')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('parent-footer')).not.toBeInTheDocument();

      // Unmount the child
      await fireEvent.click(screen.getByTestId('toggle-child'));

      // After child unmounts, parent's footer should be shown again
      await waitFor(() => {
        expect(screen.getByTestId('parent-footer')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('child-footer')).not.toBeInTheDocument();
    });

    it('when nested slot conditionally disappears, parent falls back to its own content', async () => {
      // This tests the fix for the registration bug where slots were registered
      // on every render but never unregistered when they disappeared
      const ChildWithConditionalSlot = Vue.extend({
        components: { ResourceLayout },
        props: ['showSlot'],
        template: `
          <ResourceLayout>
            <template #sidePanel v-if="showSlot">
              <div data-testid="child-side-panel">Child Side Panel</div>
            </template>
            <template #default>
              <div data-testid="child-main">Child Main Content</div>
            </template>
          </ResourceLayout>
        `,
      });

      const ParentWithChild = Vue.extend({
        components: { ResourceLayout, ChildWithConditionalSlot },
        data() {
          return { childHasSlot: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side Panel</div>
              </template>
              <template #default>
                <ChildWithConditionalSlot :showSlot="childHasSlot" />
              </template>
            </ResourceLayout>
            <button data-testid="toggle-slot" @click="childHasSlot = !childHasSlot">Toggle Slot</button>
          </div>
        `,
      });

      render(ParentWithChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Initially, child's side panel should be shown (child claims it)
      expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();

      // Make the child's slot disappear (but child component stays mounted)
      await fireEvent.click(screen.getByTestId('toggle-slot'));

      // After child's slot disappears, parent's side panel should be shown
      expect(screen.queryByTestId('child-side-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();

      // Re-enable child's slot
      await fireEvent.click(screen.getByTestId('toggle-slot'));

      // Child should reclaim the side panel
      expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();
    });

    it('when nested slot content changes, parent renders the updated content (not stale)', async () => {
      // This tests that syncRegistration always pushes the latest slot closure,
      // not a stale one captured on first registration
      const ChildWithDynamicSlot = Vue.extend({
        components: { ResourceLayout },
        props: ['label'],
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="child-side-panel">{{ label }}</div>
            </template>
            <template #default>
              <div data-testid="child-main">Child Main</div>
            </template>
          </ResourceLayout>
        `,
      });

      const ParentWithChild = Vue.extend({
        components: { ResourceLayout, ChildWithDynamicSlot },
        data() {
          return { currentLabel: 'Version 1' };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side Panel</div>
              </template>
              <template #default>
                <ChildWithDynamicSlot :label="currentLabel" />
              </template>
            </ResourceLayout>
            <button data-testid="change-label" @click="currentLabel = 'Version 2'">Change</button>
          </div>
        `,
      });

      render(ParentWithChild);

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Initially shows Version 1
      expect(screen.getByTestId('child-side-panel')).toHaveTextContent('Version 1');

      // Change the label
      await fireEvent.click(screen.getByTestId('change-label'));

      // Should show Version 2, not stale Version 1
      expect(screen.getByTestId('child-side-panel')).toHaveTextContent('Version 2');
    });
  });

  describe('responsive behavior', () => {
    describe('breakpoint 0-1 (modal mode)', () => {
      beforeEach(() => {
        setBreakpoint(0);
      });

      it('side panel opens as modal overlay', async () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        // In modal mode, side panel is rendered inside SidePanelModal
        expect(screen.getByTestId('side-panel-modal-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('side-panel-modal')).toBeInTheDocument();
      });

      it('modal uses close (X) icon', async () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        // The close button in the modal header should use 'close' icon
        const sidePanelModal = screen.getByTestId('side-panel-modal');
        const toggle = sidePanelModal.querySelector('[data-testid="side-panel-toggle"]');
        expect(toggle).toBeInTheDocument();
      });
    });

    describe('breakpoint 2 (modal mode)', () => {
      beforeEach(() => {
        setBreakpoint(2);
      });

      it('side panel opens as modal overlay', async () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        expect(screen.getByTestId('side-panel-modal-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('side-panel-modal')).toBeInTheDocument();
      });
    });

    describe('breakpoint 3+ (push mode)', () => {
      beforeEach(() => {
        setBreakpoint(4);
      });

      it('side panel pushes content when open', async () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
          default: '<div data-testid="main-content">Main</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        // In push mode, side panel is rendered inline as aside (not in modal)
        expect(screen.queryByTestId('side-panel-modal-wrapper')).not.toBeInTheDocument();
        expect(screen.getByTestId('side-panel')).toBeInTheDocument();
      });

      it('side panel uses aside element', async () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        const sidePanel = screen.getByTestId('side-panel');
        expect(sidePanel.tagName).toBe('ASIDE');
      });

      it('push mode uses menu icon for close button', async () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        const sidePanel = screen.getByTestId('side-panel');
        const toggle = sidePanel.querySelector('[data-testid="side-panel-toggle"]');
        expect(toggle).toBeInTheDocument();
      });
    });

    describe('breakpoint transitions while panel is open', () => {
      it('switches from push mode to modal mode when breakpoint decreases', async () => {
        setBreakpoint(4); // Start in push mode
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
          default: '<div data-testid="main-content">Main</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        // Verify push mode: inline aside, no modal
        expect(screen.getByTestId('side-panel')).toBeInTheDocument();
        expect(screen.queryByTestId('side-panel-modal-wrapper')).not.toBeInTheDocument();

        // Simulate resize to small breakpoint
        setBreakpoint(1);
        await waitFor(() => {
          expect(screen.getByTestId('side-panel-modal-wrapper')).toBeInTheDocument();
        });
        expect(screen.getByTestId('side-panel-modal')).toBeInTheDocument();
        // Push mode aside should be gone
        expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
      });

      it('switches from modal mode to push mode when breakpoint increases', async () => {
        setBreakpoint(1); // Start in modal mode
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
          default: '<div data-testid="main-content">Main</div>',
        });

        await fireEvent.click(screen.getByTestId('side-panel-toggle'));

        // Verify modal mode
        expect(screen.getByTestId('side-panel-modal-wrapper')).toBeInTheDocument();
        expect(screen.getByTestId('side-panel-modal')).toBeInTheDocument();

        // Simulate resize to large breakpoint
        setBreakpoint(4);
        await waitFor(() => {
          expect(screen.getByTestId('side-panel')).toBeInTheDocument();
        });
        // Modal should be gone
        expect(screen.queryByTestId('side-panel-modal-wrapper')).not.toBeInTheDocument();
      });
    });
  });

  describe('layout structure', () => {
    it('renders side panel on the RIGHT side of main content', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        default: '<div data-testid="main-content">Main</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      const mainContentArea = screen.getByTestId('main-content-area');
      const sidePanel = screen.getByTestId('side-panel');

      // Both should be in the DOM
      expect(mainContentArea).toBeInTheDocument();
      expect(sidePanel).toBeInTheDocument();

      // Side panel should come after main column in DOM order (right side in LTR)
      const body = screen.getByTestId('body');
      const children = Array.from(body.children);
      const mainIndex = children.findIndex(el => el.contains(mainContentArea));
      const sideIndex = children.indexOf(sidePanel);
      expect(sideIndex).toBeGreaterThan(mainIndex);
    });

    it('top bar contains topBar slot content', () => {
      renderResourceLayout({
        topBar: '<div data-testid="top-bar-content">Top Bar</div>',
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      const topBar = screen.getByTestId('top-bar');
      expect(topBar).toBeInTheDocument();
      expect(screen.getByTestId('top-bar-content')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-toggle')).toBeInTheDocument();
    });

    it('bottom bar is inside the main column', async () => {
      renderResourceLayout({
        bottomBar: '<div data-testid="bottom-bar-content">Bottom Bar</div>',
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        default: '<div data-testid="main-content">Main</div>',
      });

      const bottomBarArea = screen.getByTestId('bottom-bar-area');
      const mainContentArea = screen.getByTestId('main-content-area');

      // Both should share the same parent (main-column)
      expect(bottomBarArea.parentElement).toBe(mainContentArea.parentElement);
    });

    it('side panel header, content, and footer are all inside the aside', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        sidePanelFooter: '<div data-testid="side-panel-footer-content">Footer</div>',
        sidePanelTopBar: '<div data-testid="side-panel-title-content">Title</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      const aside = screen.getByTestId('side-panel');
      expect(aside).toContainElement(screen.getByTestId('side-panel-header'));
      expect(aside).toContainElement(screen.getByTestId('side-panel-content'));
      expect(aside).toContainElement(screen.getByTestId('side-panel-footer'));
    });
  });

  describe('sibling ResourceLayout identity tracking', () => {
    it('unmounting one sibling does not clear the other sibling side panel', async () => {
      const Parent = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showSibling1: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showSibling1">
                  <template #sidePanel>
                    <div data-testid="sibling1-side-panel">Sibling 1 Side</div>
                  </template>
                  <template #default>
                    <div>Sibling 1 Main</div>
                  </template>
                </ResourceLayout>
                <ResourceLayout>
                  <template #sidePanel>
                    <div data-testid="sibling2-side-panel">Sibling 2 Side</div>
                  </template>
                  <template #default>
                    <div>Sibling 2 Main</div>
                  </template>
                </ResourceLayout>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-sibling1" @click="showSibling1 = !showSibling1">Toggle</button>
          </div>
        `,
      });

      render(Parent);
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Sibling2 rendered last, so it should own the side panel
      expect(screen.getByTestId('sibling2-side-panel')).toBeInTheDocument();

      // Unmount sibling1 — sibling2's content should remain
      await fireEvent.click(screen.getByTestId('toggle-sibling1'));

      expect(screen.getByTestId('sibling2-side-panel')).toBeInTheDocument();
    });

    it('unmounting the owning sibling restores the other sibling side panel', async () => {
      const Parent = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showSibling2: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side</div>
              </template>
              <template #default>
                <ResourceLayout>
                  <template #sidePanel>
                    <div data-testid="sibling1-side-panel">Sibling 1 Side</div>
                  </template>
                  <template #default>
                    <div>Sibling 1 Main</div>
                  </template>
                </ResourceLayout>
                <ResourceLayout v-if="showSibling2">
                  <template #sidePanel>
                    <div data-testid="sibling2-side-panel">Sibling 2 Side</div>
                  </template>
                  <template #default>
                    <div>Sibling 2 Main</div>
                  </template>
                </ResourceLayout>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-sibling2" @click="showSibling2 = !showSibling2">Toggle</button>
          </div>
        `,
      });

      render(Parent);
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // Sibling2 rendered last, so it owns the side panel
      expect(screen.getByTestId('sibling2-side-panel')).toBeInTheDocument();

      // Unmount sibling2 — sibling1 should take over
      await fireEvent.click(screen.getByTestId('toggle-sibling2'));

      await waitFor(() => {
        expect(screen.getByTestId('sibling1-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('sibling2-side-panel')).not.toBeInTheDocument();
    });

    it('unmounting one sibling does not clear the other sibling bottom bar', async () => {
      const Parent = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showSibling1: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #bottomBar>
                <div data-testid="parent-bottom-bar">Parent Bottom</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showSibling1">
                  <template #bottomBar>
                    <div data-testid="sibling1-bottom-bar">Sibling 1 Bottom</div>
                  </template>
                  <template #default>
                    <div>Sibling 1 Main</div>
                  </template>
                </ResourceLayout>
                <ResourceLayout>
                  <template #bottomBar>
                    <div data-testid="sibling2-bottom-bar">Sibling 2 Bottom</div>
                  </template>
                  <template #default>
                    <div>Sibling 2 Main</div>
                  </template>
                </ResourceLayout>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-sibling1" @click="showSibling1 = !showSibling1">Toggle</button>
          </div>
        `,
      });

      render(Parent);

      await waitFor(() => {
        expect(screen.getByTestId('sibling2-bottom-bar')).toBeInTheDocument();
      });

      // Unmount sibling1 — sibling2's bottom bar should remain
      await fireEvent.click(screen.getByTestId('toggle-sibling1'));

      expect(screen.getByTestId('sibling2-bottom-bar')).toBeInTheDocument();
    });

    it('when all siblings unmount, parent falls back to its own content', async () => {
      const Parent = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showChildren: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="parent-side-panel">Parent Side</div>
              </template>
              <template #default>
                <template v-if="showChildren">
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="sibling1-side-panel">Sibling 1 Side</div>
                    </template>
                    <template #default>
                      <div>Sibling 1 Main</div>
                    </template>
                  </ResourceLayout>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="sibling2-side-panel">Sibling 2 Side</div>
                    </template>
                    <template #default>
                      <div>Sibling 2 Main</div>
                    </template>
                  </ResourceLayout>
                </template>
                <div v-else data-testid="no-children">No children</div>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-children" @click="showChildren = !showChildren">Toggle</button>
          </div>
        `,
      });

      render(Parent);
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // A sibling owns the side panel
      expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();

      // Unmount all children — parent should fall back to own content
      await fireEvent.click(screen.getByTestId('toggle-children'));

      await waitFor(() => {
        expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
      });
    });
  });
});
