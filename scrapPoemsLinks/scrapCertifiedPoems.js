
const scrapCertifiedPoetPoems = (main) => {
    const poemsElements = main.querySelectorAll('article.poet-poem-row');

    const poems = [];
    for (let i = 0; i < poemsElements.length; i++) {
        poems.push({
            poetId: null,
            poemId: null,
            link: poemsElements[i].querySelector('a').getAttribute('href'),
        });
    }
    return poems;
};


export const scrapCertifiedPoems = async (page) => {

    const poetPoems = [];
    const unfoundedSubLinks = [];
    let currentLink;
    do {
        if (currentLink) {
            const result = await page.goto(currentLink, { timeout: 240_000});
            if (!result || !result.ok()) {
                unfoundedSubLinks.push(currentLink);
                break;
            }
        }
        const [poems, next] = await Promise.all(
            [
                page.$eval('section.poet-poems-panel > div.poet-poem-list', scrapCertifiedPoetPoems),
                page.$eval('section.poet-poems-panel', (main) => {
                    const loader = main.querySelector('div.community-infinite-loader');
                    return loader ? { link: loader.getAttribute('data-next-url') } : null;
                }),
            ]
        );
        for (let i = 0; i < poems.length; i++) {
            poetPoems.push(poems[i]);
        }
        currentLink = next?.link;
    } while(currentLink);

    return { poetPoems, unfoundedSubLinks };
};