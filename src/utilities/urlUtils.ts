// ENHANCE: This function is just a pacifier.
// The use of explicit any in the defaultValue suppresses the type checking.
// There are actually tons of functions which can receive undefined as input, but are not are expecting it.
// I suppose eventually we could use a getRequiredStringUrlParam to distinguish this,
// but for now just leaving this function definition to wrap from a type-checked call
// to a non-checked call.
export function getQueryStringParamAndUnencode(
    paramName: string,
    defaultValue?: any
): string {
    return getStringUrlParam(paramName, defaultValue);
}

export function getStringUrlParam(
    paramName: string,
    defaultValue: string
): string;
export function getStringUrlParam(
    paramName: string,
    defaultValue?: string | undefined
): string | undefined;
export function getStringUrlParam(
    paramName: string,
    defaultValue?: string | undefined
): string | undefined {
    return getUrlParam(paramName, s => s, defaultValue);
}
/**
 * Finds the specified query param string in the URL and returns the deserialized value
 *
 * @param paramName - The name of the query param
 * @param deserializeCallback - A function which deserializes the query param's value from a string to the desired type
 * @param defaultValue - The default value to return in case the query param is not defined in the URL
 */
export function getUrlParam<T>(
    paramName: string,
    deserializeCallback: (s: string) => T,
    defaultValue: T
): T {
    const values = parseUriComponent(window.location.search);
    if (
        defaultValue !== undefined &&
        (values[paramName] === undefined || values[paramName] === null)
    ) {
        return defaultValue;
    }
    return deserializeCallback(values[paramName]);
}

export function parseUriComponent(searchPortionOfLocation: string): object {
    const afterQuestionMark = searchPortionOfLocation.substring(1);
    return afterQuestionMark
        .replace(/\+/g, " ")
        .split("&")
        .filter(Boolean)
        .reduce((values, item) => {
            const ref = item.split("=");
            const key = decodeURIComponent(ref[0] || "");
            const val = decodeURIComponent(ref[1] || "");
            values[key] = val;
            return values;
        }, {});
}

export function getBooleanUrlParam(
    paramName: string,
    defaultValue: boolean
): boolean {
    const toBool = (s: string) => s.toLowerCase() === "true";
    return getUrlParam(paramName, toBool, defaultValue);
}

export function getNumericUrlParam(paramName: string, defaultValue?: number) {
    return getUrlParam(paramName, Number.parseFloat, defaultValue);
}
