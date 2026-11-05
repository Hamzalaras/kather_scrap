import { closeBrowser, closePage, makeBrowser, makePage } from '../utils/playwrightInit.js';
import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const CSRF_TOKEN = 'FHjKrsS10EH6v0Uquu9q8x57vuPe3nsuZTGPXLg1';
const LINK_ROOT = 'https://www.aldiwan.net/';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const makeSpecialPage = async (browser) => {
    const page = await makePage(browser);
    await page.route('**/*', (route) => {
        const requestType = route.request().resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(requestType)) {
            route.abort();
        } else {
            route.continue();
        }
    });
    await page.context().addCookies([
        {
            name: 'aldyoan_session_v3',
            value: 'eyJpdiI6IjJmdTM2ckEydEs0RFRqZnI2OGlLTFE9PSIsInZhbHVlIjoidkdKNVUrRTFCRk91NkxMODlOcUFXeDJGMzJUZDQ0cXhseXpPR1d0RU1BK3ViVDdLQkpRaUZTMFkyUU1TZS9yeW9QZzlWUTk5dWl3R2p2aFlyT0FHVTlQMkpYdE9FQUpBQjIvODhiVWJGNStsVVVGNU5hcUJDeE1MU0htYjZiQmciLCJtYWMiOiIxZGMyMDExY2IzMGUxZmUwOTY0NGI4MjQyM2Q5ZTY1ODgxMDIzN2I2OWEzOWMyNTA4MWI2NWMyNzI1Mzc2YjE1IiwidGFnIjoiIn0%3D',
            domain: '.aldiwan.net',
            path: '/',
            httpOnly: true,
            secure: true,
        },
        {
            name: 'aldiwan_vid',
            value: 'efa713b5f4f055da5c5222f7b2cb2911',
            domain: '.aldiwan.net',
            path: '/',
            httpOnly: true,
            secure: true,
        }
    ]);
    let failed;
    const result = await page.goto(LINK_ROOT, { timeout: 240_000 })
        .catch(error => (failed = error, null));
    if (failed || !result || !result.ok()) {
        console.log('Couldn t get into the page, retrying\n');
        console.log(failed);
        await sleep(10_000);
        return await makeSpecialPage(browser);
    }
    return page;
};

const appendFile = async (data, filePath) => {
    let existingData = [];
    try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        existingData = JSON.parse(fileContent);
    } catch (e) {
    }
    existingData.push(...data);
    await fs.writeFile(filePath, JSON.stringify(existingData, null, 2));
};

const writeFiles = async (explanations, errors, fileNum) => {
    console.log(`Start appending to the file ${fileNum} ...`);

    if (explanations.length > 0) {
        await appendFile(explanations, `./seedData/explanations/poems${fileNum}.json`);
        explanations.length = 0;
    }

    if (errors.length > 0) {
        await appendFile(errors, `./seedData/explanations/errors${fileNum}.json`);
        errors.length = 0;
    }

    console.log(`Done appending to the file ${fileNum}.`);
};

const scrapPoemsExplanations = async (poemsLinks, fileNum, donePoemIds) => {
    const browser = await makeBrowser();
    let page = await makeSpecialPage(browser);

    const explanations = [];
    const errors = [];

    const length = poemsLinks.length;
    let processedCount = 0;

    for (let i = 0; i < poemsLinks.length; i++) {
        const currentLink = poemsLinks[i];

        if (donePoemIds.has(currentLink.poemId)) {
            continue;
        }

        const explainUrl = `${LINK_ROOT}poems/${currentLink.link.replace(`${LINK_ROOT}poem`, '').replace('.html', '')}/explain`;

        console.log(`Getting the explanation of the poem: ${currentLink.link}, ${i + 1} of ${length} ${((i + 1) / length).toFixed(6)}`);

        let failed;
        const explanationData = await scrapExplanationData(CSRF_TOKEN, explainUrl, page)
            .catch(error => (failed = error, null));
            
        if (failed || !explanationData) {
            errors.push({ ...currentLink, error: failed?.message });
            console.log(failed);
            console.log('Couldn t get explanation\n');
            await sleep(Math.random() * 2_000 + 10_000);
        } else {
            console.log('Got it');
            explanations.push({
                poemId: currentLink.poemId,
                ...formatExplanation(explanationData.explanation),
            });
            await sleep(Math.random() * 2_000 + 10_000);
        }
        
        processedCount++;

        if (processedCount > 0 && processedCount % 100 === 0) {
            console.log('\nRefreshing the page...');
            await closePage(page);
            page = await makeSpecialPage(browser);
            console.log('Refreshed.\n');
            await sleep(10_000);
        }

        if (explanations.length >= 50 || errors.length >= 50) {
            await writeFiles(explanations, errors, fileNum);
        }
    }

    if (explanations.length > 0 || errors.length > 0) {
        await writeFiles(explanations, errors, fileNum);
    }

    console.log(`done processing the file ${fileNum}.\n`);
    await closePage(page);
    await closeBrowser(browser);
};

async function scrapExplanationData(csrfToken, explainUrl, page) {
    const evaluateFun = async ([csrfToken, explainUrl]) => {
        const res = await fetch(explainUrl, {
            method: 'POST',
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrfToken,
                'Content-Type': 'application/json',
            },
        });
        if (!res.ok) {
            throw new Error(`Status code: ${res.status}`);
        }
        return await res.json();
    };

    return await page.evaluate(evaluateFun, [csrfToken, explainUrl]);
};

function formatExplanation(rawText) {
    const parsed = {
        general_idea: '',
        themes: '',
        styles: '',
        summary: '',
        rawText,
    };

    if (!rawText) return parsed;

    const part1 = rawText.split(/1\).*?الفكرة.*?العامة.*?:/i)[1];
    const part2 = rawText.split(/2\).*?الموضوعات.*?:/i)[1];
    const part3 = rawText.split(/3\).*?الصور.*?:/i)[1];
    const part4 = rawText.split(/4\).*?خلاصة.*?نقاط.*?:/i)[1];

    parsed.general_idea = part1 ? part1.split(/2\).*?الموضوعات/)[0].replace(/###/g, '').trim() : '';
    parsed.themes = part2 ? part2.split(/3\).*?الصور/)[0].replace(/###/g, '').trim() : '';
    parsed.styles = part3 ? part3.split(/4\).*?خلاصة.*?نقاط/)[0].replace(/###/g, '').trim() : '';
    parsed.summary = part4 ? part4.replace(/###/g, '').trim() : '';

    return parsed;
}

const declancher = async () => {
    const explanationsFiles = await getDirJsons('../seedData/explanations').catch(() => []);

    const rawPoemsLinksFiles = (await getDirJsons('../seedData/poemsLinks'))
        .filter(file => file.startsWith('poems'));

    const pendingFilesToScrap = [];

    for (let i = 0; i < rawPoemsLinksFiles.length; i++) {
        const fileName = rawPoemsLinksFiles[i];
        const fileNum = fileName.replace('.json', '').replace('poems', '');
        
        const expectedExplFile = `poems${fileNum}.json`;
        const expectedErrorFile = `errors${fileNum}.json`;
        const donePoemIds = new Set();

        if (explanationsFiles.includes(expectedExplFile)) {
            const explData = await getContentOfJsonFile(`../seedData/explanations/${expectedExplFile}`);
            explData.forEach(item => donePoemIds.add(item.poemId));
        }
        if (explanationsFiles.includes(expectedErrorFile)) {
             const errorData = await getContentOfJsonFile(`../seedData/explanations/${expectedErrorFile}`);
             errorData.forEach(item => donePoemIds.add(item.poemId));
        }

        const poemsLinks = await getContentOfJsonFile(`../seedData/poemsLinks/${fileName}`);
        
        if (donePoemIds.size < poemsLinks.length && poemsLinks.length > 0) {
            pendingFilesToScrap.push({
                file: fileName,
                fileNum: fileNum,
                poemsLinks: poemsLinks,
                donePoemIds: donePoemIds
            });
        }
    }

    console.log(`You have ${pendingFilesToScrap.length} files to scrap:`, pendingFilesToScrap.map(p => p.file), '...');

    for (let i = 0; i < pendingFilesToScrap.length; i++) {
        const { poemsLinks, fileNum, donePoemIds } = pendingFilesToScrap[i];
        await scrapPoemsExplanations(poemsLinks, fileNum, donePoemIds);
    }
};

await declancher();