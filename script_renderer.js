let style = document.createElement('style');
style.innerHTML = `
*[class^="channelTextArea-"] {
    border: 1px solid var(--channels-default);
}

*[class^="channelTextArea-"], *[class^="channelTextArea-"] > *[class^="scrollableContainer-"] {
    border-radius: 0;
}

*[class^="replyBar-"] {
    border-radius: 0;
}

*[class^="clipContainer-"] {
    margin-top: 0;
}
`;

document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => {
        if(!document.documentElement.classList.contains('theme-amoled')) document.documentElement.classList.add('theme-amoled');
        if(!document.body.contains(style)) document.body.appendChild(style);
    }).observe(document.documentElement, { attributes: true });
});