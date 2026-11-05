import * as cheerio from 'cheerio';



const scrapUserPoetPoems = (main) => {
    const poemsElements = main.querySelectorAll('article.poem-item > div.profile-poem-copy > h3 > a');

    const poems = [];
    for (let i = 0; i < poemsElements.length; i++) {
        poems.push({
            poetId: null,
            poemId: null,
            link: poemsElements[i].getAttribute('href'),
        });
    }

    return poems;
};


export const scrapUserPoems = async (page) => {
    const [poetPoems, isInfinite] = await Promise.all(
                [
                    page.$eval('#profileTabContent > div.poem-list', scrapUserPoetPoems),
                    page.$eval('#profileTabContent', (main) => {
                        const sentinel = main.querySelector('div.profile-poem-load-sentinel');
                        return sentinel ? 
                                {
                                    cursor: sentinel.getAttribute('data-cursor'),
                                    link: sentinel.getAttribute('data-url')
                                }
                                : null;
                    }),
                ]
    );
    const unfoundedSubLinks = [];
    if (isInfinite) {
        let currentCursor = isInfinite.cursor;
        while (currentCursor) {
            const result = await page.goto(`${isInfinite.link}?cursor=${currentCursor}`, { timeout: 240_000});
            if (!result || !result.ok()) {
                unfoundedSubLinks.push(`${isInfinite.link}?cursor=${currentCursor}`);
                break;
            }
            const json = JSON.parse(await page.$eval('pre', (pre) => pre.textContent));

            const $ = cheerio.load(json.html);
            const poemsElements = $('article.poem-item > div.profile-poem-copy > h3 > a').toArray();
            for (let i = 0; i < poemsElements.length; i++) {
                poetPoems.push({
                    poetId: null,
                    poemId: null,
                    link: poemsElements[i].attribs['href'],
                });
            }
            currentCursor = json.next_cursor;
        }
    }

    return { poetPoems, unfoundedSubLinks };
};