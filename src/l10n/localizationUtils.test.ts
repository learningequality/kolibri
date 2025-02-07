import { LocalizationUtils } from "./localizationUtils";

test("getBookLanguage1", () => {
    const body = document.createElement("body");

    body.innerHTML = `
    <div id="bloomDataDiv">
        <div data-book="contentLanguage1" lang="*">
            aaa
        </div>
    </div>`;

    const language1 = LocalizationUtils.getBookLanguage1(body);

    expect(language1).toEqual("aaa");
});

test("getNationalLanguagesFromCssStyles", () => {
    const cssText = `
BODY
{
    font-family: 'Andika New Basic';
    direction: ltr;
}

.numberedPage::after
{
    font-family: 'Andika New Basic';
    direction: ltr;
}

[lang='aaa']
{
    font-family: 'Andika New Basic';
    direction: ltr;
}

[lang='bbb']
{
    font-family: 'Andika New Basic';
    direction: ltr;
}

  [lang='ccc']
{
    font-family: 'Andika New Basic';
    direction: ltr;
}`;

    const [
        language2,
        language3
    ] = LocalizationUtils.getNationalLanguagesFromCssStyles(cssText);

    expect(language2).toEqual("bbb");
    expect(language3).toEqual("ccc");
});
