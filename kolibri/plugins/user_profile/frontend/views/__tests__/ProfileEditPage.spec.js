import { nextTick } from 'vue';
import { render, screen } from '@testing-library/vue';
import VueRouter from 'vue-router';
import FacilityUserResource from 'kolibri-common/apiResources/FacilityUserResource';
import useUser, { useUserMock } from 'kolibri/composables/useUser'; // eslint-disable-line
import ProfileEditPage, { pageTitleStrings } from '../ProfileEditPage';
import makeStore from '../../__tests__/utils/makeStore';

jest.mock('kolibri/composables/useUser');

jest.spyOn(FacilityUserResource, 'retrieve').mockResolvedValue({});

const { editProfileHeader$ } = pageTitleStrings;

describe('ProfileEditPage', () => {
  it('titles the tab with its visible header, the only h1', async () => {
    useUser.mockImplementation(() => useUserMock());
    document.title = '';
    const router = new VueRouter();
    router.getRoute = () => '/';
    render(ProfileEditPage, { store: makeStore(), routes: router });
    await nextTick();
    expect(document.title).toBe(`${editProfileHeader$()} - Kolibri`);
    const headings = screen.queryAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(editProfileHeader$());
  });
});
