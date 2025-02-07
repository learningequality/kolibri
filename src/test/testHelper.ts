export function createDiv({
    id,
    classAttr,
    content,
    tabindex,
    parent
}: {
    id?: string;
    classAttr?: string;
    content?: string;
    tabindex?: string;
    parent?: HTMLElement;
}): HTMLElement {
    return createElement({
        tag: "div",
        id,
        classAttr,
        content,
        tabindex,
        parent
    });
}

export function createDataDivItem({
    key,
    lang,
    content,
    parent
}: {
    key: string;
    lang: string;
    content: string;
    parent?: HTMLElement;
}) {
    const result = createElement({ tag: "div", content, parent });
    result.setAttribute("data-book", key);
    result.setAttribute("lang", lang);
    return result;
}

export function createSpan(params: {
    id: string;
    classAttr: string;
    content?: string;
    tabindex?: string;
    parent?: HTMLElement;
}): HTMLElement {
    return createElement({
        tag: "span",
        ...params
    });
}

export function createPara(params: {
    id: string;
    classAttr: string;
    content?: string;
    tabindex?: string;
    parent?: HTMLElement;
}): HTMLElement {
    return createElement({
        tag: "p",
        ...params
    });
}

export function createElement({
    tag,
    id,
    classAttr,
    content,
    tabindex,
    parent
}: {
    tag: string;
    id?: string;
    classAttr?: string;
    content?: string;
    tabindex?: string;
    parent?: HTMLElement;
}): HTMLElement {
    const result = document.createElement(tag);
    if (id) {
        result.setAttribute("id", id);
    }
    if (classAttr) {
        result.setAttribute("class", classAttr);
    }
    if (tabindex) {
        result.setAttribute("tabindex", tabindex);
    }
    if (content) {
        result.innerHTML = content;
    }
    if (parent) {
        parent.appendChild(result);
    }
    return result;
}
