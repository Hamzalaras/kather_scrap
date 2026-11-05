import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import { resolveAttr } from '../utils/detecteAttr.js';
import { makeBrowser, makePage, closeBrowser, closePage } from '../utils/playwrightInit.js';
import fs from 'node:fs/promises';

const scrapPoemInfo = async (page) => {
    const [poemName, links] = await Promise.all(
        [
            page.$eval('div.poem-reader-card > h1#poem-title', main => main.textContent.trim()),
            page.$eval('div.poem-reader-card > div.poem-tags', main => {
                const a = main.querySelectorAll('a');
                const links = [];
                for (let i = 0; i < a.length; i++) {
                    links.push(a[i].getAttribute('href'));
                }
                return links;
            }),
        ]
    );
    return { poemName, links };
};


const scrapPoems = async (poemsLinks, fileNum) => {
    const browser = await makeBrowser();
    let page = await makePage(browser);

    const newPoems = [];

    const susAttributes = [];
    const errors = [];

    const length = poemsLinks.length;

    for (let i = 0; i < length; i++) {
        const currentLink = poemsLinks[i];
        console.log(`Getting the poet of the link: ${currentLink.link}, ${i + 1} of ${length} ${((i + 1) / length).toFixed(6)}`);

        let failed;
        const result = await page.goto(currentLink.link, { timeout: 240_000 })
            .catch(error => (failed = error, null));
        if (failed || !result || !result.ok()) {
            errors.push({ ...currentLink, error: failed?.message });
            continue;
        }

        const { poemName, links } = await scrapPoemInfo(page)
            .catch(error => (failed = error, { poemName: null, links: [] }));
        if (failed) {
            errors.push({ ...currentLink, error: failed.message });
            continue
        }
        const { resolvedAtt, isSus } = resolveAttr(
            links.map(link => decodeURIComponent(link).replace('.html', '').split('-').reverse()[0]),
        );
        if (isSus) {
            susAttributes.push(currentLink);
        }

        const { topic_id, type_id, sea_id, quafia_id } = resolvedAtt;
        newPoems.push({
            id: currentLink.poemId,
            name: poemName,
            poet_id: currentLink.poetId,
            topic_id, type_id, sea_id, quafia_id,
        });
        if (i > 0 && i % 100 === 0) {
            console.log('\nrefreshing the page...');
            await closePage(page);
            page = await makePage(browser);
            console.log('refreshed.\n');
        }
    }


    await fs.writeFile(`./seedData/poems/poems${fileNum}.json`, JSON.stringify(newPoems, null, 2));
    newPoems.length = 0;

    if (susAttributes.length > 0) {
        await fs.writeFile(`./seedData/poemsLinks/susAttributes${fileNum}.json`, JSON.stringify(susAttributes, null, 2));
        susAttributes.length = 0;
    }

    if (errors.length > 0) {
        await fs.writeFile(`./seedData/poemsLinks/errors${fileNum}.json`, JSON.stringify(errors, null, 2));
        errors.length = 0;
    }

    console.log(`done writing the file ${fileNum}.\n`);
    await closePage(page);
    await closeBrowser(browser);
};

const declancher = async () => {
    const poemsFiles = await getDirJsons('../seedData/poems');

    const doneFiles = new Set();
    for (let i = 0; i < poemsFiles.length; i++) {
        doneFiles.add(poemsFiles[i].replace('poems', '').replace('.json', ''));
    }

    const poemsLinksFiles = (await getDirJsons('../seedData/poemsLinks'))
        .filter(file => {
            return file.startsWith('poems')
                && !doneFiles.has(
                    file.replace('poems', '').replace('.json', '')
                )
        });

    console.log(`You have ${poemsLinksFiles.length} files to scrap:`, poemsLinksFiles, '...');

    for (let i = 0; i < poemsLinksFiles.length; i++) {
        const fileNum = poemsLinksFiles[i].replace('.json', '').replace('poems', '');
        const poemsLinks = await getContentOfJsonFile(`../seedData/poemsLinks/${poemsLinksFiles[i]}`);
        await scrapPoems(poemsLinks, fileNum);
    }
};

await declancher();