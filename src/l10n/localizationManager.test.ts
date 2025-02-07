import { LocalizationManager } from "./localizationManager";

// Perhaps it isn't intuitive from the name, but beforeAll means once
// before any tests. The other option is beforeEach which we don't want.
beforeAll(() => {
    LocalizationManager.setUp({
        en: {
            "Sample.ID": {
                message: "Sample English Text",
                description: "This is a test."
            }
        },
        fr: {
            "Sample.ID": {
                message: "Sample French Text",
                description: "This is a test."
            }
        },
        hi: {
            "Sample.ID": {
                message: "Sample Hindi Text",
                description: "This is a test."
            }
        },
        sp: {
            // We don't expect this to ever happen in real data
            "Sample.ID.WithoutEnglish": {
                message: "Sample Spanish Text",
                description: "This is a test."
            }
        }
    });
});

test("localizePages replaces element text with translation and sets lang attribute", () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("bloom-page");

    const div = document.createElement("div");
    div.setAttribute("data-i18n", "Sample.ID");
    div.innerText = "Sample English Text";
    div.setAttribute("lang", "en");
    wrapper.appendChild(div);

    LocalizationManager.localizePages(wrapper, ["xyz", "fr", "hi"]);
    expect(div.innerText).toEqual("Sample French Text");
    expect(div.getAttribute("lang")).toEqual("fr");
});

test("localizePages leaves original English text and lang when no other translation found", () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("bloom-page");

    const div = document.createElement("div");
    div.setAttribute("data-i18n", "Sample.ID");
    div.innerText = "Sample English Text";
    div.setAttribute("lang", "en");
    wrapper.appendChild(div);

    LocalizationManager.localizePages(wrapper, ["xyz", "sp"]);
    expect(div.innerText).toEqual("Sample English Text");
    expect(div.getAttribute("lang")).toEqual("en");
});

// In practice, I doubt we will ever have this situation, because the original will probably always be English
test("localizePages falls back to English text and lang when no other translation found", () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("bloom-page");

    const div = document.createElement("div");
    div.setAttribute("data-i18n", "Sample.ID");
    div.innerText = "Sample Chinese Text";
    div.setAttribute("lang", "zh-CN");
    wrapper.appendChild(div);

    LocalizationManager.localizePages(wrapper, ["xyz", "sp"]);
    expect(div.innerText).toEqual("Sample English Text");
    expect(div.getAttribute("lang")).toEqual("en");
});

// In practice, I doubt we will ever have this situation, because we expect the i18n data to always have English
test("localizePages leaves original text and lang when no translation found, not even English", () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("bloom-page");

    const div = document.createElement("div");
    div.setAttribute("data-i18n", "Sample.ID.WithoutEnglish");
    div.innerText = "Sample Chinese Text";
    div.setAttribute("lang", "zh-CN");
    wrapper.appendChild(div);

    LocalizationManager.localizePages(wrapper, ["xyz", "pt"]);
    expect(div.innerText).toEqual("Sample Chinese Text");
    expect(div.getAttribute("lang")).toEqual("zh-CN");
});

test("localizePages leaves original text and lang when l10n ID not found", () => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("bloom-page");

    const div = document.createElement("div");
    div.setAttribute("data-i18n", "ID.Does.Not.Exist");
    div.innerText = "Sample Chinese Text";
    div.setAttribute("lang", "zh-CN");
    wrapper.appendChild(div);

    LocalizationManager.localizePages(wrapper, ["xyz", "sp"]);
    expect(div.innerText).toEqual("Sample Chinese Text");
    expect(div.getAttribute("lang")).toEqual("zh-CN");
});
