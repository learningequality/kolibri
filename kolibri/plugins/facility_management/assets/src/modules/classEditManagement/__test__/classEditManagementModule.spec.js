import makeStore from '../../../../test/makeStore';

describe('classEditManagement module', () => {
  it('UPDATE_CLASS mutation updates both the class list and the current class', () => {
    const store = makeStore();
    store.state.classEditManagement.classes = [
      { id: 'class_1', name: 'class one' },
      { id: 'class_2', name: 'class two' },
    ];
    store.state.classEditManagement.currentClass = { id: 'class_2', name: 'class two' };

    store.commit('classEditManagement/UPDATE_CLASS', {
      id: 'class_2',
      updatedClass: {
        id: 'class_2',
        name: 'class two edited',
      },
    });

    expect(store.state.classEditManagement.classes).toEqual([
      { id: 'class_1', name: 'class one' },
      { id: 'class_2', name: 'class two edited' },
    ]);
    expect(store.state.classEditManagement.currentClass).toEqual({
      id: 'class_2',
      name: 'class two edited',
    });
  });
});
