import { shallowMount } from '@vue/test-utils';
import CoachIndex from '../../src/views/CoachIndex';

describe('CoachIndex', () => {
  it('is redirected to Learn on an SoUD', () => {
    const redirectMethod = jest.spyOn(CoachIndex.methods, 'redirectToLearn');
    shallowMount(CoachIndex, {
      methods: { redirectToLearn: jest.fn() },
      data() {
        return { isSubsetOfUsersDevice: true };
      },
    });
    expect(redirectMethod).toHaveBeenCalled();
  });
});
