import usePageTitle from 'kolibri/composables/usePageTitle';
import themeConfig from 'kolibri/styles/themeConfig';

// AuthBase shows its sign-in title, the page's visible h1, only when the theme enables it.
export default function useAuthPageTitle(title) {
  usePageTitle(title, { hasVisibleHeading: themeConfig.signIn.showTitle });
}
