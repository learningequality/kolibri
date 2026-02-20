export default function useDrag() {
  function _shiftOne(oldIndex, newIndex, array) {
    const items = [...array];
    const oldItem = items[newIndex];
    items[newIndex] = items[oldIndex];
    items[oldIndex] = oldItem;
    return items;
  }

  function moveUpOne(oldIndex, array) {
    return _shiftOne(oldIndex, oldIndex - 1, array);
  }

  function moveDownOne(oldIndex, array) {
    return _shiftOne(oldIndex, oldIndex + 1, array);
  }

  return {
    moveUpOne,
    moveDownOne,
  };
}
