import { roundToNearestK } from "./mathUtils";

const roundToNearestEvenCases = [
    [0, 0],
    [1, 2],
    [2, 2],
    [2.99, 2],
    [3, 4],
    [3.99, 4],
    [4, 4]
];
test.each(roundToNearestEvenCases)(
    "roundToNearestK, k=2",
    (input, expected) => {
        const result = roundToNearestK(input, 2);
        expect(result).toEqual(expected);
    }
);

const roundToNearest4Cases = [
    [0, 0],
    [1, 0],
    [1.99, 0],
    [2, 4],
    [3, 4],
    [3.99, 4],
    [4, 4]
];

test.each(roundToNearest4Cases)("roundToNearestK, k=4", (input, expected) => {
    const result = roundToNearestK(input, 4);
    expect(result).toEqual(expected);
});
