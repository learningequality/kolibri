import LessonReportResource from '../../../apiResources/lessonReport';
import makeStore from '../../../../test/makeStore';

describe('lessonSummary actions', () => {
  let store;
  beforeEach(() => {
    store = makeStore();
  });

  it('setLessonReportTableData updates Vuex correctly', async () => {
    jest.spyOn(LessonReportResource, 'fetchModel').mockResolvedValue({
      id: 'lesson_1',
    });
    await store.dispatch('lessonSummary/setLessonReportTableData', {
      lessonId: 'lesson_1',
    });
    expect(store.state.lessonSummary.lessonReport).toEqual({
      id: 'lesson_1',
    });
    LessonReportResource.fetchModel.mockRestore();
  });
});
