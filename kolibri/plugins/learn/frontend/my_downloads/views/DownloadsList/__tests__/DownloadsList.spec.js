import DownloadsList from '../index.vue';

describe('DownloadsList', () => {
  it('uses the first activity when resolving a download icon', () => {
    const getLearningActivityIcon = jest.fn(activity => `${activity}-icon`);

    const icon = DownloadsList.methods.getIcon.call({ getLearningActivityIcon }, ['WATCH', 'READ']);

    expect(getLearningActivityIcon).toHaveBeenCalledWith('WATCH');
    expect(icon).toBe('WATCH-icon');
  });
});
