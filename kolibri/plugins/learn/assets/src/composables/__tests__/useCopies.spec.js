import useCopies from '../useCopies';

describe('useCopies', () => {
  it('should default to an empty array', () => {
    const { displayedCopies } = useCopies();
    expect(displayedCopies.copies).toEqual([]);
  });
  it('should set displayed copies to value passed to setCopies function', () => {
    const { displayedCopies, setCopies } = useCopies();
    setCopies([{ id: '1' }, { id: '2' }]);
    expect(displayedCopies.copies).toEqual([{ id: '1' }, { id: '2' }]);
  });
  it('displayedCopies should be a module-level store, so the previous test should still pass', () => {
    const { displayedCopies } = useCopies();
    expect(displayedCopies.copies).toEqual([{ id: '1' }, { id: '2' }]);
  });
  it('should reset displayedCopies to an empty array when clearCopies is called', () => {
    const { displayedCopies, clearCopies } = useCopies();
    clearCopies();
    expect(displayedCopies.copies).toEqual([]);
  });
});
