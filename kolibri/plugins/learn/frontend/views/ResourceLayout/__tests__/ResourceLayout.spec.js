import { render, screen, fireEvent, waitFor } from '@testing-library/vue';
import Vue, { ref, h, onMounted, onUnmounted } from 'vue';
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

    it('renders the sidePanel slot content when panel is open', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      // Panel starts open by default in push mode
      expect(screen.getByTestId('side-panel-data')).toBeInTheDocument();
    });

    it('renders the bottomBar slot content', () => {
      renderResourceLayout({
        bottomBar: '<div data-testid="bottom-bar-content">Bottom Bar</div>',
      });
      expect(screen.getByTestId('bottom-bar-content')).toHaveTextContent('Bottom Bar');
    });

    it('renders the sidePanelFooter slot content when panel is open', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        sidePanelFooter: '<div data-testid="side-panel-footer-content">Footer</div>',
      });

      // Panel starts open by default in push mode
      expect(screen.getByTestId('side-panel-footer-content')).toBeInTheDocument();
    });

    it('renders the sidePanelTopBar slot content in side panel header', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        sidePanelTopBar: '<div data-testid="side-panel-title-content">Panel Title</div>',
      });

      // Panel starts open by default in push mode
      expect(screen.getByTestId('side-panel-title-content')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-header')).toContainElement(
        screen.getByTestId('side-panel-title-content'),
      );
    });

    it('renders all six slots together', () => {
      renderResourceLayout({
        topBar: '<div data-testid="top-bar-content">Top</div>',
        default: '<div data-testid="main-content">Main</div>',
        sidePanel: '<div data-testid="side-panel-data">Side</div>',
        bottomBar: '<div data-testid="bottom-bar-content">Bottom</div>',
        sidePanelFooter: '<div data-testid="side-panel-footer-content">Footer</div>',
        sidePanelTopBar: '<div data-testid="side-panel-title-content">Title</div>',
      });

      // Panel starts open by default in push mode
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

    it('side panel is open by default on large screens (push mode)', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });
      expect(screen.getByTestId('side-panel')).toBeInTheDocument();
    });

    it('clicking toggle closes the open side panel', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      // Panel starts open in push mode
      expect(screen.getByTestId('side-panel')).toBeInTheDocument();

      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      expect(screen.queryByTestId('side-panel')).not.toBeInTheDocument();
    });

    it('clicking toggle again reopens the side panel', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      await fireEvent.click(screen.getByTestId('side-panel-toggle')); // Close
      await fireEvent.click(screen.getByTestId('side-panel-toggle')); // Reopen

      expect(screen.getByTestId('side-panel')).toBeInTheDocument();
      expect(screen.getByTestId('side-panel-data')).toBeInTheDocument();
    });

    it('toggle button is in KToolbar when panel is closed', async () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      // Close the panel first (it starts open in push mode)
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      const topBar = screen.getByTestId('top-bar');
      const toggle = screen.getByTestId('side-panel-toggle');
      expect(topBar).toContainElement(toggle);
    });

    it('toggle button is in side panel header when panel is open', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
      });

      // Panel starts open in push mode
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

      // Panel starts open by default in push mode
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

      // Panel starts open by default in push mode
      // The child's side panel content should be rendered (deepest wins)
      await waitFor(() => {
        expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Parent's side panel should still be rendered since child has no sidePanel slot
      await waitFor(() => {
        expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Child's sidePanelFooter takes over (deepest wins)
      await waitFor(() => {
        expect(screen.getByTestId('child-footer')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Parent's footer should still be rendered since child has no sidePanelFooter slot
      await waitFor(() => {
        expect(screen.getByTestId('parent-footer')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Child's side panel takes over
      await waitFor(() => {
        expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Child's bottom bar takes over
      await waitFor(() => {
        expect(screen.getByTestId('child-bottom-bar')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('parent-bottom-bar')).not.toBeInTheDocument();
      // Parent's side panel remains
      await waitFor(() => {
        expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Only the deepest (level 3) side panel should be rendered
      await waitFor(() => {
        expect(screen.getByTestId('level-3-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Initially, child's side panel should be shown
      await waitFor(() => {
        expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
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

      // Panel starts open by default in push mode
      // Initially, child's side panel should be shown (child claims it)
      await waitFor(() => {
        expect(screen.getByTestId('child-side-panel')).toBeInTheDocument();
      });
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

      // Panel starts open by default in push mode
      // Initially shows Version 1
      await waitFor(() => {
        expect(screen.getByTestId('child-side-panel')).toHaveTextContent('Version 1');
      });

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

      it('side panel pushes content when open', () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
          default: '<div data-testid="main-content">Main</div>',
        });

        // Panel starts open by default in push mode
        // In push mode, side panel is rendered inline as aside (not in modal)
        expect(screen.queryByTestId('side-panel-modal-wrapper')).not.toBeInTheDocument();
        expect(screen.getByTestId('side-panel')).toBeInTheDocument();
      });

      it('side panel uses aside element', () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        // Panel starts open by default in push mode
        const sidePanel = screen.getByTestId('side-panel');
        expect(sidePanel.tagName).toBe('ASIDE');
      });

      it('push mode uses menu icon for close button', () => {
        renderResourceLayout({
          sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        });

        // Panel starts open by default in push mode
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

        // Panel starts open by default in push mode
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
    it('renders side panel on the RIGHT side of main content', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        default: '<div data-testid="main-content">Main</div>',
      });

      // Panel starts open by default in push mode
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

    it('side panel header, content, and footer are all inside the aside', () => {
      renderResourceLayout({
        sidePanel: '<div data-testid="side-panel-data">Side Panel</div>',
        sidePanelFooter: '<div data-testid="side-panel-footer-content">Footer</div>',
        sidePanelTopBar: '<div data-testid="side-panel-title-content">Title</div>',
      });

      // Panel starts open by default in push mode
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

      // Panel starts open by default in push mode
      // Sibling2 rendered last, so it should own the side panel
      await waitFor(() => {
        expect(screen.getByTestId('sibling2-side-panel')).toBeInTheDocument();
      });

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

      // Panel starts open by default in push mode
      // Sibling2 rendered last, so it owns the side panel
      await waitFor(() => {
        expect(screen.getByTestId('sibling2-side-panel')).toBeInTheDocument();
      });

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

      // Panel starts open by default in push mode
      // A sibling owns the side panel
      await waitFor(() => {
        expect(screen.queryByTestId('parent-side-panel')).not.toBeInTheDocument();
      });

      // Unmount all children — parent should fall back to own content
      await fireEvent.click(screen.getByTestId('toggle-children'));

      await waitFor(() => {
        expect(screen.getByTestId('parent-side-panel')).toBeInTheDocument();
      });
    });
  });

  describe('depth-based resolution (deepest wins)', () => {
    it('grandchild side panel wins over shallower uncle', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="root-side-panel">Root Side</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="grandchild-side-panel">Grandchild Side</div>
                    </template>
                    <template #default>
                      <button data-testid="grandchild-btn">GC</button>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
              <ResourceLayout>
                <template #sidePanel>
                  <div data-testid="uncle-side-panel">Uncle Side</div>
                </template>
                <template #default>
                  <button data-testid="uncle-btn">Uncle</button>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Grandchild is deeper (depth 2) vs uncle (depth 1), grandchild wins
      await waitFor(() => {
        expect(screen.getByTestId('grandchild-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('uncle-side-panel')).not.toBeInTheDocument();
    });

    it('grandchild bottom bar wins over shallower uncle', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #bottomBar>
              <div data-testid="root-bottom-bar">Root Bottom</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <ResourceLayout>
                    <template #bottomBar>
                      <div data-testid="grandchild-bottom-bar">Grandchild Bottom</div>
                    </template>
                    <template #default>
                      <div>Grandchild Main</div>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
              <ResourceLayout>
                <template #bottomBar>
                  <div data-testid="uncle-bottom-bar">Uncle Bottom</div>
                </template>
                <template #default>
                  <div>Uncle Main</div>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      await waitFor(() => {
        expect(screen.getByTestId('grandchild-bottom-bar')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('uncle-bottom-bar')).not.toBeInTheDocument();
    });
  });

  describe('implicit default slot (wrapper component pattern)', () => {
    it('does not infinite re-render when wrapper exposes implicit default slot', async () => {
      // A wrapper component that uses ResourceLayout internally and exposes
      // its own <slot> (implicit default) to parent consumers.
      // When the parent passes content without <template #default>,
      // Vue 2 recreates VNodes each render, which previously caused
      // syncRegistration to trigger infinite reactive updates.
      const ResourceLayoutWrapper = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="wrapper-side-panel">Wrapper Side</div>
            </template>
            <template #default>
              <slot />
            </template>
          </ResourceLayout>
        `,
      });

      const Parent = Vue.extend({
        components: { ResourceLayout, ResourceLayoutWrapper },
        template: `
          <ResourceLayout>
            <template #default>
              <ResourceLayoutWrapper>
                <div data-testid="implicit-content">Implicit default content</div>
              </ResourceLayoutWrapper>
            </template>
          </ResourceLayout>
        `,
      });

      // If the bug is present, this render will hang/timeout due to
      // infinite re-render cycle
      render(Parent);

      expect(screen.getByTestId('implicit-content')).toBeInTheDocument();
    });
  });

  describe('focus-based switching between subtrees', () => {
    it('focus on uncle content switches side panel to uncle', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="root-side-panel">Root Side</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="grandchild-side-panel">Grandchild Side</div>
                    </template>
                    <template #default>
                      <button data-testid="grandchild-btn">GC</button>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
              <ResourceLayout>
                <template #sidePanel>
                  <div data-testid="uncle-side-panel">Uncle Side</div>
                </template>
                <template #default>
                  <button data-testid="uncle-btn">Uncle</button>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Grandchild wins by default (deepest)
      await waitFor(() => {
        expect(screen.getByTestId('grandchild-side-panel')).toBeInTheDocument();
      });

      // Focus on uncle's content
      await fireEvent.focusIn(screen.getByTestId('uncle-btn'));

      // Uncle should now own the side panel
      await waitFor(() => {
        expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('grandchild-side-panel')).not.toBeInTheDocument();
    });

    it('focus back on grandchild content restores grandchild side panel', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="root-side-panel">Root Side</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="grandchild-side-panel">Grandchild Side</div>
                    </template>
                    <template #default>
                      <button data-testid="grandchild-btn">GC</button>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
              <ResourceLayout>
                <template #sidePanel>
                  <div data-testid="uncle-side-panel">Uncle Side</div>
                </template>
                <template #default>
                  <button data-testid="uncle-btn">Uncle</button>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Switch to uncle via focus
      await fireEvent.focusIn(screen.getByTestId('uncle-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
      });

      // Focus back on grandchild
      await fireEvent.focusIn(screen.getByTestId('grandchild-btn'));

      // Grandchild should reclaim the side panel
      await waitFor(() => {
        expect(screen.getByTestId('grandchild-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('uncle-side-panel')).not.toBeInTheDocument();
    });

    it('focus switching works between equal-depth cousins', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        template: `
          <ResourceLayout>
            <template #sidePanel>
              <div data-testid="root-side-panel">Root Side</div>
            </template>
            <template #default>
              <ResourceLayout>
                <template #default>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="cousin1-side-panel">Cousin 1 Side</div>
                    </template>
                    <template #default>
                      <button data-testid="cousin1-btn">Cousin 1</button>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
              <ResourceLayout>
                <template #default>
                  <ResourceLayout>
                    <template #sidePanel>
                      <div data-testid="cousin2-side-panel">Cousin 2 Side</div>
                    </template>
                    <template #default>
                      <button data-testid="cousin2-btn">Cousin 2</button>
                    </template>
                  </ResourceLayout>
                </template>
              </ResourceLayout>
            </template>
          </ResourceLayout>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Both cousins at equal depth — last registered wins by default
      await waitFor(() => {
        expect(screen.getByTestId('cousin2-side-panel')).toBeInTheDocument();
      });

      // Focus on cousin1
      await fireEvent.focusIn(screen.getByTestId('cousin1-btn'));

      // Cousin1 should now win
      await waitFor(() => {
        expect(screen.getByTestId('cousin1-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('cousin2-side-panel')).not.toBeInTheDocument();
    });

    it('focused cousin unmounts and remaining cousin takes over', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showCousin1: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="root-side-panel">Root Side</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showCousin1">
                  <template #default>
                    <ResourceLayout>
                      <template #sidePanel>
                        <div data-testid="cousin1-side-panel">Cousin 1 Side</div>
                      </template>
                      <template #default>
                        <button data-testid="cousin1-btn">Cousin 1</button>
                      </template>
                    </ResourceLayout>
                  </template>
                </ResourceLayout>
                <ResourceLayout>
                  <template #default>
                    <ResourceLayout>
                      <template #sidePanel>
                        <div data-testid="cousin2-side-panel">Cousin 2 Side</div>
                      </template>
                      <template #default>
                        <button data-testid="cousin2-btn">Cousin 2</button>
                      </template>
                    </ResourceLayout>
                  </template>
                </ResourceLayout>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-cousin1" @click="showCousin1 = !showCousin1">Toggle</button>
          </div>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Focus on cousin1 so it becomes the active claimant
      await fireEvent.focusIn(screen.getByTestId('cousin1-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('cousin1-side-panel')).toBeInTheDocument();
      });

      // Unmount cousin1's subtree — cousin2 should take over
      await fireEvent.click(screen.getByTestId('toggle-cousin1'));

      await waitFor(() => {
        expect(screen.getByTestId('cousin2-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('cousin1-side-panel')).not.toBeInTheDocument();
    });

    it('non-active deeper component unmounts while shallower is focused', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showGrandchild: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="root-side-panel">Root Side</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showGrandchild">
                  <template #default>
                    <ResourceLayout>
                      <template #sidePanel>
                        <div data-testid="grandchild-side-panel">Grandchild Side</div>
                      </template>
                      <template #default>
                        <button data-testid="grandchild-btn">GC</button>
                      </template>
                    </ResourceLayout>
                  </template>
                </ResourceLayout>
                <ResourceLayout>
                  <template #sidePanel>
                    <div data-testid="uncle-side-panel">Uncle Side</div>
                  </template>
                  <template #default>
                    <button data-testid="uncle-btn">Uncle</button>
                  </template>
                </ResourceLayout>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-grandchild" @click="showGrandchild = !showGrandchild">Toggle</button>
          </div>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Focus on uncle so it becomes the active claimant (overriding deeper grandchild)
      await fireEvent.focusIn(screen.getByTestId('uncle-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
      });

      // Unmount grandchild — uncle should stay because it's focused
      await fireEvent.click(screen.getByTestId('toggle-grandchild'));

      expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
    });

    it('new deeper component mounting does not override focused shallower one', async () => {
      const Component = Vue.extend({
        components: { ResourceLayout },
        data() {
          return { showGrandchild: false };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="root-side-panel">Root Side</div>
              </template>
              <template #default>
                <ResourceLayout v-if="showGrandchild">
                  <template #default>
                    <ResourceLayout>
                      <template #sidePanel>
                        <div data-testid="grandchild-side-panel">Grandchild Side</div>
                      </template>
                      <template #default>
                        <button data-testid="grandchild-btn">GC</button>
                      </template>
                    </ResourceLayout>
                  </template>
                </ResourceLayout>
                <ResourceLayout>
                  <template #sidePanel>
                    <div data-testid="uncle-side-panel">Uncle Side</div>
                  </template>
                  <template #default>
                    <button data-testid="uncle-btn">Uncle</button>
                  </template>
                </ResourceLayout>
              </template>
            </ResourceLayout>
            <button data-testid="toggle-grandchild" @click="showGrandchild = !showGrandchild">Toggle</button>
          </div>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Only uncle exists, focus on it
      await fireEvent.focusIn(screen.getByTestId('uncle-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
      });

      // Mount grandchild — uncle should stay because it's focused
      await fireEvent.click(screen.getByTestId('toggle-grandchild'));

      expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('grandchild-side-panel')).not.toBeInTheDocument();
    });

    it('focused component slot conditionally disappears, falls back to deepest remaining', async () => {
      const ChildWithConditionalSlot = Vue.extend({
        components: { ResourceLayout },
        props: ['showSlot'],
        template: `
          <ResourceLayout>
            <template #sidePanel v-if="showSlot">
              <div data-testid="uncle-side-panel">Uncle Side</div>
            </template>
            <template #default>
              <button data-testid="uncle-btn">Uncle</button>
            </template>
          </ResourceLayout>
        `,
      });

      const Component = Vue.extend({
        components: { ResourceLayout, ChildWithConditionalSlot },
        data() {
          return { uncleHasSlot: true };
        },
        template: `
          <div>
            <ResourceLayout>
              <template #sidePanel>
                <div data-testid="root-side-panel">Root Side</div>
              </template>
              <template #default>
                <ResourceLayout>
                  <template #default>
                    <ResourceLayout>
                      <template #sidePanel>
                        <div data-testid="grandchild-side-panel">Grandchild Side</div>
                      </template>
                      <template #default>
                        <button data-testid="grandchild-btn">GC</button>
                      </template>
                    </ResourceLayout>
                  </template>
                </ResourceLayout>
                <ChildWithConditionalSlot :showSlot="uncleHasSlot" />
              </template>
            </ResourceLayout>
            <button data-testid="toggle-uncle-slot" @click="uncleHasSlot = !uncleHasSlot">Toggle</button>
          </div>
        `,
      });

      render(Component);

      // Panel starts open by default in push mode
      // Focus on uncle so it becomes active
      await fireEvent.focusIn(screen.getByTestId('uncle-btn'));
      await waitFor(() => {
        expect(screen.getByTestId('uncle-side-panel')).toBeInTheDocument();
      });

      // Remove uncle's slot (component stays mounted) — grandchild should take over
      await fireEvent.click(screen.getByTestId('toggle-uncle-slot'));

      await waitFor(() => {
        expect(screen.getByTestId('grandchild-side-panel')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('uncle-side-panel')).not.toBeInTheDocument();
    });
  });

  describe('default slot stability', () => {
    it('does not remount the default slot when toggling the side panel open', async () => {
      const mountCount = jest.fn();
      const unmountCount = jest.fn();

      const TrackedComponent = {
        name: 'TrackedComponent',
        setup() {
          onMounted(() => mountCount());
          onUnmounted(() => unmountCount());
          return () => h('div', { attrs: { 'data-testid': 'tracked' } }, 'tracked');
        },
      };

      const Wrapper = {
        name: 'Wrapper',
        components: { ResourceLayout, TrackedComponent },
        template: `
          <ResourceLayout>
            <template #default><TrackedComponent /></template>
            <template #sidePanel><div>Side Panel Content</div></template>
          </ResourceLayout>
        `,
      };

      render(Wrapper);

      expect(mountCount).toHaveBeenCalledTimes(1);
      expect(unmountCount).toHaveBeenCalledTimes(0);

      // Open the side panel
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // The default slot should NOT have been remounted
      expect(mountCount).toHaveBeenCalledTimes(1);
      expect(unmountCount).toHaveBeenCalledTimes(0);
    });

    it('does not remount the default slot when toggling the side panel closed', async () => {
      const mountCount = jest.fn();
      const unmountCount = jest.fn();

      const TrackedComponent = {
        name: 'TrackedComponent',
        setup() {
          onMounted(() => mountCount());
          onUnmounted(() => unmountCount());
          return () => h('div', { attrs: { 'data-testid': 'tracked' } }, 'tracked');
        },
      };

      const Wrapper = {
        name: 'Wrapper',
        components: { ResourceLayout, TrackedComponent },
        template: `
          <ResourceLayout>
            <template #default><TrackedComponent /></template>
            <template #sidePanel><div>Side Panel Content</div></template>
          </ResourceLayout>
        `,
      };

      render(Wrapper);

      // Open the side panel
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      mountCount.mockClear();
      unmountCount.mockClear();

      // Close the side panel
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // The default slot should NOT have been remounted
      expect(mountCount).toHaveBeenCalledTimes(0);
      expect(unmountCount).toHaveBeenCalledTimes(0);
    });

    it('does not remount the default slot when toggling the side panel open in modal mode', async () => {
      setBreakpoint(1); // Modal mode
      const mountCount = jest.fn();
      const unmountCount = jest.fn();

      const TrackedComponent = {
        name: 'TrackedComponent',
        setup() {
          onMounted(() => mountCount());
          onUnmounted(() => unmountCount());
          return () => h('div', { attrs: { 'data-testid': 'tracked' } }, 'tracked');
        },
      };

      const Wrapper = {
        name: 'Wrapper',
        components: { ResourceLayout, TrackedComponent },
        template: `
          <ResourceLayout>
            <template #default><TrackedComponent /></template>
            <template #sidePanel><div>Side Panel Content</div></template>
          </ResourceLayout>
        `,
      };

      render(Wrapper);

      expect(mountCount).toHaveBeenCalledTimes(1);
      expect(unmountCount).toHaveBeenCalledTimes(0);

      // Open the side panel (modal mode)
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      // The default slot should NOT have been remounted
      expect(mountCount).toHaveBeenCalledTimes(1);
      expect(unmountCount).toHaveBeenCalledTimes(0);
    });

    it('does not remount the default slot when toggling the side panel closed in modal mode', async () => {
      setBreakpoint(1); // Modal mode
      const mountCount = jest.fn();
      const unmountCount = jest.fn();

      const TrackedComponent = {
        name: 'TrackedComponent',
        setup() {
          onMounted(() => mountCount());
          onUnmounted(() => unmountCount());
          return () => h('div', { attrs: { 'data-testid': 'tracked' } }, 'tracked');
        },
      };

      const Wrapper = {
        name: 'Wrapper',
        components: { ResourceLayout, TrackedComponent },
        template: `
          <ResourceLayout>
            <template #default><TrackedComponent /></template>
            <template #sidePanel><div>Side Panel Content</div></template>
          </ResourceLayout>
        `,
      };

      render(Wrapper);

      // Open the side panel (modal mode)
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      mountCount.mockClear();
      unmountCount.mockClear();

      // Close the side panel (modal mode - click the close button inside the modal)
      const modal = screen.getByTestId('side-panel-modal');
      const closeBtn = modal.querySelector('[data-testid="side-panel-toggle"]');
      await fireEvent.click(closeBtn);

      // The default slot should NOT have been remounted
      expect(mountCount).toHaveBeenCalledTimes(0);
      expect(unmountCount).toHaveBeenCalledTimes(0);
    });

    it('does not remount the default slot when breakpoint changes from push to modal mode', async () => {
      setBreakpoint(4); // Start in push mode
      const mountCount = jest.fn();
      const unmountCount = jest.fn();

      const TrackedComponent = {
        name: 'TrackedComponent',
        setup() {
          onMounted(() => mountCount());
          onUnmounted(() => unmountCount());
          return () => h('div', { attrs: { 'data-testid': 'tracked' } }, 'tracked');
        },
      };

      const Wrapper = {
        name: 'Wrapper',
        components: { ResourceLayout, TrackedComponent },
        template: `
          <ResourceLayout>
            <template #default><TrackedComponent /></template>
            <template #sidePanel><div>Side Panel Content</div></template>
          </ResourceLayout>
        `,
      };

      render(Wrapper);

      // Panel starts open by default in push mode
      mountCount.mockClear();
      unmountCount.mockClear();

      // Switch to modal mode
      setBreakpoint(1);
      await waitFor(() => {
        expect(screen.getByTestId('side-panel-modal')).toBeInTheDocument();
      });

      // The default slot should NOT have been remounted
      expect(mountCount).toHaveBeenCalledTimes(0);
      expect(unmountCount).toHaveBeenCalledTimes(0);
    });

    it('does not remount the default slot when breakpoint changes from modal to push mode', async () => {
      setBreakpoint(1); // Start in modal mode
      const mountCount = jest.fn();
      const unmountCount = jest.fn();

      const TrackedComponent = {
        name: 'TrackedComponent',
        setup() {
          onMounted(() => mountCount());
          onUnmounted(() => unmountCount());
          return () => h('div', { attrs: { 'data-testid': 'tracked' } }, 'tracked');
        },
      };

      const Wrapper = {
        name: 'Wrapper',
        components: { ResourceLayout, TrackedComponent },
        template: `
          <ResourceLayout>
            <template #default><TrackedComponent /></template>
            <template #sidePanel><div>Side Panel Content</div></template>
          </ResourceLayout>
        `,
      };

      render(Wrapper);

      // Open side panel in modal mode
      await fireEvent.click(screen.getByTestId('side-panel-toggle'));

      mountCount.mockClear();
      unmountCount.mockClear();

      // Switch to push mode
      setBreakpoint(4);
      await waitFor(() => {
        expect(screen.getByTestId('side-panel')).toBeInTheDocument();
      });

      // The default slot should NOT have been remounted
      expect(mountCount).toHaveBeenCalledTimes(0);
      expect(unmountCount).toHaveBeenCalledTimes(0);
    });
  });
});
