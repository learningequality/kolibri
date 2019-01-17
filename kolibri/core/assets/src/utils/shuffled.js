import shuffle from 'knuth-shuffle-seeded';

// Returns a shuffled copy of the array.
// If no seed is given, chooses one randomly.
export default function(arr, seed = undefined) {
  if (seed === undefined) {
    return shuffle(arr.slice(0), Math.random());
  }
  return shuffle(arr.slice(0), seed);
}
