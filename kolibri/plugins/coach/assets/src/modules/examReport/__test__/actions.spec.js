import { ExamLogResource, FacilityUserResource } from 'kolibri.resources';
import makeStore from '../../../../test/makeStore';

describe('examReport actions', () => {
  it('setTableData updates Vuex correctly', async () => {
    jest.spyOn(ExamLogResource, 'fetchCollection').mockResolvedValue([]);
    jest.spyOn(FacilityUserResource, 'fetchCollection').mockResolvedValue([]);
    const store = makeStore();
    await store.dispatch('examReport/setTableData', {
      examId: 'exam_1',
      classId: 'classroom_1',
    });
    expect(store.state.examReport.examTakers).toEqual([]);
    ExamLogResource.fetchCollection.mockRestore();
    FacilityUserResource.fetchCollection.mockRestore();
  });
});
