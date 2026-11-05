import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import { makeBrowser, makePage, closeBrowser, closePage } from '../utils/playwrightInit.js';
import fs from 'node:fs/promises';
import { removeDoubleLinks } from '../utils/removeDoubleLinks.js';

const currentFileNum = 15;



const getAvailableLinks = async () => {
    const poetsLinksFiles = (await getDirJsons('../../data3/poetsLinks')).filter(file => file.startsWith('poets'));
    const links = new Set();
    for (let i = 0; i < poetsLinksFiles.length; i++) {
        const content = await getContentOfJsonFile(`../../data3/poetsLinks/${poetsLinksFiles[i]}`);

        for (let j = 0; j < content.length; j++) {
            links.add(content[j].link);
        }
    }
    return links;
};

const scrapPoetsLinks = async (baseLink, limit) => {
    const browser = await makeBrowser()
    const page = await makePage(browser);

    let globalPoetsId = 3669;
    const availableLinks = await getAvailableLinks();
    const tempLinks = [];
    const newLinks = [];

    const unfoundedLinks = [];

    for (let i = 1; i <= limit; i++) {
        const link = `${baseLink}?page=${i}`;
        console.log(`getting the link: ${link}, ${i} of ${limit} ${(i / limit).toFixed(4)} ...`);

        const result = await page.goto(link);
        if (!result || !result.ok()) {
            unfoundedLinks.push(link);
            continue;
        }

        const poets = await page.$$eval('#poetsGrid > article.poets-person-card', articles => {
            const poets = [];

            for (let i = 0; i < articles.length; i++) {
                poets.push({
                    poetId: null,
                    link: articles[i].querySelector('a.poets-person-link').getAttribute('href'),
                });
            }

            return poets;
        });

        for (let j = 0; j < poets.length; j++) {
            tempLinks.push(poets[j]);
        }
    }

    removeDoubleLinks(tempLinks);

    for (let i = 0; i < tempLinks.length; i++) {
        if (!availableLinks.has(tempLinks[i].link)) {
            tempLinks[i].poetId = globalPoetsId++;
            newLinks.push(tempLinks[i]);
        };
    }

    await fs.writeFile(`./data3/poetsLinks/poets_${currentFileNum}.json`, JSON.stringify(newLinks, null, 2));
    if (unfoundedLinks.length > 0) {
        await fs.writeFile('./data3/poetsLinks/poetsUnfoundedLinks.json', JSON.stringify(unfoundedLinks, null, 2))
    };

    await closePage(page);
    await closeBrowser(browser);
};

await scrapPoetsLinks('https://www.aldiwan.net/Poets-Authors', 92);
