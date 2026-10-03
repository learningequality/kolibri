import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import { coreStrings } from 'kolibri/uiText/commonCoreStrings';
import UsageAndPrivacy from '../UsageAndPrivacy';

const { usageAndPrivacyLabel$ } = coreStrings;

describe('UsageAndPrivacy page title', () => {
  beforeEach(() => {
    document.title = '';
  });

  it('sets the tab title to the page label', async () => {
    render(UsageAndPrivacy, { routes: [] });
    await nextTick();
    expect(document.title).toBe(`${usageAndPrivacyLabel$()} - Kolibri`);
  });

  it('renders the page label as the only h1', () => {
    render(UsageAndPrivacy, { routes: [] });
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(usageAndPrivacyLabel$());
  });
});
