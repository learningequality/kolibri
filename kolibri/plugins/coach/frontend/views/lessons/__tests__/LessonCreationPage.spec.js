import { ERROR_CONSTANTS } from 'kolibri/constants';
import LessonCreationPage from '../LessonCreationPage.vue';

describe('LessonCreationPage', () => {
  it.each([
    { description: 'blank title', errorCode: 'BLANK' },
    { description: 'duplicate title', errorCode: ERROR_CONSTANTS.UNIQUE },
  ])('shows the title error for a $description response', async ({ errorCode }) => {
    const handleSubmitTitleFailure = jest.fn();
    const handleSubmitFailure = jest.fn();
    const dispatch = jest.fn(() => Promise.reject({ response: { data: [{ id: errorCode }] } }));
    const payload = { title: '' };

    LessonCreationPage.methods.createLesson.call(
      {
        classId: 'class-id',
        $store: { dispatch },
        showSnackbarNotification: jest.fn(),
        $refs: {
          detailsModal: {
            handleSubmitTitleFailure,
            handleSubmitFailure,
          },
        },
      },
      payload,
    );
    await global.flushPromises();

    expect(dispatch).toHaveBeenCalledWith('lessonsRoot/createLesson', {
      classId: 'class-id',
      payload,
    });
    expect(handleSubmitTitleFailure).toHaveBeenCalledTimes(1);
    expect(handleSubmitFailure).not.toHaveBeenCalled();
  });
});
