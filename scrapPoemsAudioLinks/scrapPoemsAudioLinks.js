import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import { makeBrowser, makePage, closeBrowser, closePage } from '../utils/playwrightInit.js';
import fs from 'node:fs/promises';

const currentFileNum = 1;

const normalizeLink = (link) => {
    if (!link) return '';
    try {
        const url = new URL(link, 'https://www.aldiwan.net');
        return decodeURI(url.pathname);
    } catch (e) {
        return decodeURI(link);
    }
};

const removeDoubleLinks = (arr) => {
    const uniqueMap = new Map();
    for (const item of arr) {
        const cleanLink = normalizeLink(item.poemLink);
        if (!uniqueMap.has(cleanLink)) {
            uniqueMap.set(cleanLink, item);
        }
    }
    return Array.from(uniqueMap.values());
};

const getPoemsLinks = async () => {
    const poemsLinksFiles = (await getDirJsons('../../data3/poemsLinks')).filter(file => file.startsWith('poems'));
    const links = new Map();
    for (let i = 0; i < poemsLinksFiles.length; i++) {
        const content = await getContentOfJsonFile(`../../data3/poemsLinks/${poemsLinksFiles[i]}`);

        for (let j = 0; j < content.length; j++) {
            const cleanLink = normalizeLink(content[j].link);
            links.set(cleanLink, content[j].poemId);
        }
    }
    return links;
};

const getAvailableLinks = async () => {
    const poetsLinksFiles = (await getDirJsons('../../data3/poemsAudioLinks')).filter(file => file.startsWith('audio'));
    const links = new Set();
    for (let i = 0; i < poetsLinksFiles.length; i++) {
        const content = await getContentOfJsonFile(`../../data3/poemsAudioLinks/${poetsLinksFiles[i]}`);

        for (let j = 0; j < content.length; j++) {
            const cleanLink = normalizeLink(content[j].poemLink);
            links.add(cleanLink);
        }
    }
    return links;
};

const scrapPoemsAudioLinks = async (baseLink, limit) => {
    const browser = await makeBrowser();
    const page = await makePage(browser);

    let globalPoemsAudioId = 1;
    const availableLinks = await getAvailableLinks();
    let tempLinks = [];
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

        const poems = await page.$$eval('#audioPoemsGrid > article.audio-poem-card', articles => {
            const pagePoems = [];

            for (let k = 0; k < articles.length; k++) {
                const btn = articles[k].querySelector('button');
                const aTag = articles[k].querySelector('div.audio-card-body > h2 > a');

                pagePoems.push({
                    poemAudioId: null,
                    poemId: null,
                    audioLink: btn ? (btn.getAttribute('data-audio-url') || btn.getAttribute('data-audio-fallback-url')) : null,
                    poemLink: aTag ? aTag.getAttribute('href') : null
                });
            }

            return pagePoems;
        });

        tempLinks.push(...poems);
    }

    tempLinks = removeDoubleLinks(tempLinks);

    const poemsLinks = await getPoemsLinks();
    
    for (let i = 0; i < tempLinks.length; i++) {
        const cleanPoemLink = normalizeLink(tempLinks[i].poemLink);

        if (!availableLinks.has(cleanPoemLink)) {
            tempLinks[i].poemAudioId = globalPoemsAudioId++;
            tempLinks[i].poemId = poemsLinks.get(cleanPoemLink) || null;
            newLinks.push(tempLinks[i]);
        }
    }

    await fs.writeFile(`./data3/poemsAudioLinks/audio${currentFileNum}.json`, JSON.stringify(newLinks, null, 2));
    if (unfoundedLinks.length > 0) {
        await fs.writeFile('./data3/poemsAudioLinks/poemsUnfoundedLinks.json', JSON.stringify(unfoundedLinks, null, 2));
    }

    await closePage(page);
    await closeBrowser(browser);
};

await scrapPoemsAudioLinks('https://www.aldiwan.net/audio-poems', 20);