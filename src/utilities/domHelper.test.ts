import { DomHelper } from "./domHelper";

const cases = [
    ["url('abc.jpg')", "abc.jpg"],
    ['url("abc.jpg")', "abc.jpg"],
    [" url('abc') ", "abc"],
    ["url('abc(1).jpg')", "abc(1).jpg"],
    ["url('abc - (1).jpg')", "abc - (1).jpg"],
    ["url('abc%20-%20(1).jpg')", "abc%20-%20(1).jpg"],
    ["inherit", ""],
    ["", ""]
];
test.each(cases)("getActualUrlFromCSSPropertyValue", (input, expected) => {
    expect(input).not.toBeUndefined();

    expect(DomHelper.getActualUrlFromCSSPropertyValue(input!)).toEqual(
        expected
    );
});
