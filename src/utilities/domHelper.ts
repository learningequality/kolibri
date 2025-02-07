export class DomHelper {
    public static getActualUrlFromCSSPropertyValue(cssPropertyValue: string) {
        const match = cssPropertyValue.match(/.*url\((['"])(.*?)\1\).*/i);
        if (!match) {
            return "";
        }
        return match[2];
    }
}
