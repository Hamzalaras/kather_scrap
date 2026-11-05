import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import { makeBrowser, makePage, closePage, closeBrowser } from '../utils/playwrightInit.js';
import { scrapCertified } from './scrapCertified.js';
import { scrapUser } from './scrapUser.js';
import fs from 'node:fs/promises';

export const scrapPoetsInfo = async (poetsLinks, fileNum) => {
    const browser = await makeBrowser();
    let page = await makePage(browser);

    const newPoets = [];

    const unfoundedLinks = [];
    const susPoets = [];

    for (let i = 0; i < poetsLinks.length; i++) {
        console.log(`Getting the poet of the link: ${poetsLinks[i].link}, ${i + 1} of ${poetsLinks.length} ${((i + 1) / poetsLinks.length).toFixed(4)}`);

        const isUser = poetsLinks[i].link.includes('/user/');
        const result = await page.goto(isUser ? `${poetsLinks[i].link}?tab=diwan` : poetsLinks[i].link, { timeout: 240_000 });
        if (!result || !result.ok()) {
            unfoundedLinks.push(poetsLinks[i]);
            console.log('Aborted ... \n');
            continue;
        }

        const { poetInfo, error = null } = isUser ?
            await scrapUser(page)
                .catch(error => ({ poetInfo: null, error: error }))
            : await scrapCertified(page)
                .catch(error => ({ poetInfo: null, error: error }));

        if (!poetInfo || error) {
            susPoets.push({
                poetId: poetsLinks[i].poetId,
                link: poetsLinks[i].link,
                error,
            });
        } else {
            newPoets.push({
                id: poetsLinks[i].poetId,
                ...poetInfo,
            });
        }


    }
    console.log(`start writing the file...`);

    await fs.writeFile(`./seedData/poets/poets${fileNum}.json`, JSON.stringify(newPoets, null, 2));
    newPoets.length = 0;

    if (unfoundedLinks.length > 0) {
        await fs.writeFile(`./seedData/poets/unfoundedLinks${fileNum}.json`, JSON.stringify(unfoundedLinks, null, 2));
        unfoundedLinks.length = 0;
    }

    if (susPoets.length > 0) {
        await fs.writeFile(`./seedData/poets/susPoets${fileNum}.json`, JSON.stringify(susPoets, null, 2));
        susPoets.length = 0;
    }
    console.log(`done writing the file ${fileNum}.\n`);
    await closePage(page);
    await closeBrowser(browser);
};

const declancher = async () => {
    const poetsFiles = await getDirJsons('../seedData/poets');

    const doneFiles = new Set();
    for (let i = 0; i < poetsFiles.length; i++) {
        doneFiles.add(poetsFiles[i].replace('poets', '').replace('.json', ''));
    }

    const poetsLinksFiles = (await getDirJsons('../seedData/poetsLinks'))
        .filter(file => {
            return file.startsWith('poets')
                && !doneFiles.has(
                    file.replace('poets', '').replace('.json', '')
                );
        });

    console.log(`You have ${poetsLinksFiles.length} files to scrap:`, poetsLinksFiles, '...');

    for (let i = 0; i < poetsLinksFiles.length; i++) {
        const fileNum = poetsLinksFiles[i].replace('.json', '').replace('poets', '');
        const poetsLinks = await getContentOfJsonFile(`../seedData/poetsLinks/${poetsLinksFiles[i]}`);
        await scrapPoetsInfo(poetsLinks, fileNum);
    }
};

await declancher();