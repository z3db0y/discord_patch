document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => {
        if(!document.documentElement.classList.contains('theme-amoled')) document.documentElement.classList.add('theme-amoled');
    }).observe(document.documentElement, { attributes: true });
});