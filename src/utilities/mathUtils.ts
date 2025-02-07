export function roundToNearestEven(x: number): number {
    return roundToNearestK(x, 2);
}

/**
 * Rounds to the nearest number which is evenly divisible by k.
 */
export function roundToNearestK(x: number, k: number): number {
    return Math.round(x / k) * k;
}
