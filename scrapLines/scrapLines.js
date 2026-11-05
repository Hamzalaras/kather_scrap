import { closePage, makeBrowser, makePage, closeBrowser } from '../utils/playwrightInit.js';
import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import fs from 'node:fs/promises';


const cleanLines = (toFixLines, fixedLines) => {
    fixedLines.length = 0;

    for (let i = 0; i < toFixLines.length; i++) {
        const fixedLine = toFixLines[i]
                            .trim()
                            .replaceAll(/[^\u0621-\u064A\u0671-\u06D3\u064B-\u0655\u0670\s]/g, '');
        if (/[\u0621-\u064A\u0671-\u06D3]/.test(fixedLine)) {
            fixedLines.push(fixedLine);
        }
    }

    toFixLines.length = 0;
    for (let i = 0; i < fixedLines.length; i++) {
        toFixLines.push(fixedLines[i]);
    }

    fixedLines.length = 0;
};

const scrapPoemsLines = async (page) => {
    

    const { lines, type } = await page.$eval('div.poem-verses-list', main => {
        const type = main.getAttribute('data-poem-display');

        const lines = [];
        if (type == '1') {
            const linesHolders = main.querySelectorAll('div.poem-line > span');

            for (let i = 0; i < linesHolders.length; i++) {
                const data = linesHolders[i].getAttribute('data-visual-original')
                             || linesHolders[i].getAttribute('aria-label')
                             || linesHolders[i].textContent;
                lines.push(data.trim());
            }
        } else {
            const linesHolders = main.querySelectorAll('p.poem-prose-line > span');

            for (let i = 0; i < linesHolders.length; i++) {
                lines.push(linesHolders[i].textContent.trim());
            }

        }
        return { lines, type };
    });

    return { lines, type };
};

const writeFiles = async (lines, errors, susPoems, subFile, fileNum) => {
    console.log(`Start writing the file ${fileNum}_${subFile} ...`);

    await fs.writeFile(`./seedData/lines/lines${fileNum}_${subFile}.json`, JSON.stringify(lines, null, 2));
    lines.length = 0;

    if (susPoems.length > 0) {
        await fs.writeFile(`./seedData/poemsLinks/susPoems${fileNum}_${subFile}.json`, JSON.stringify(susPoems, null, 2));
        susPoems.length = 0;
    }

    if (errors.length > 0) {
        await fs.writeFile(`./seedData/poemsLinks/errors${fileNum}_${subFile}.json`, JSON.stringify(errors, null, 2));
        errors.length = 0;
    }

    console.log(`Done writing the file ${fileNum}_${subFile}.`);

    return subFile + 1;
};


const scrapLines = async (poemsLinks, fileNum) => {
    const browser = await makeBrowser();
    let page = await makePage(browser);

    
    const newLines = [];
    const errors = [];
    const susPoems = [];
    
    const length = poemsLinks.length;
    const tempLines = [];
    let subFile = 1;

    for (let i = 0; i < length; i++) {
        const currentLink = poemsLinks[i];
        console.log(`Getting the poet of the link: ${currentLink.link}, ${i + 1} of ${length} ${((i + 1) / length ).toFixed(6)}`);

        let failed;
        const result = await page.goto(currentLink.link, { timeout: 240_000})
                            .catch(error => (failed = error, null));
        if (failed || !result || !result.ok()) {
            errors.push({ ...currentLink, error: failed?.message });
            continue;
        }

        const { lines, type } = await scrapPoemsLines(page)
                                    .catch(error => (failed = error, { lines: [], type: null }));
        if (failed) {
            errors.push(currentLink);
            continue;
        }
        cleanLines(lines, tempLines);
        if (lines.length === 0) {
            susPoems.push(currentLink);
            continue;
        }

        for (let j = 0; j < lines.length; j++) {
            newLines.push({
                content: lines[j],
                poem_id: currentLink.poemId,
                poet_id: currentLink.poetId,
                type: type == '1' ?
                            (j + 1) % 2 === 0 ?
                                2
                                : 1
                            : 3,
                order: j + 1,
            });
        }

        if (i > 0 && i % 100 === 0) {
            console.log('\nrefreshing the page...');
            await closePage(page);
            page = await makePage(browser);
            console.log('refreshed.\n');
        }

        if (newLines.length >= 30_000) {
           subFile = await writeFiles(newLines, errors, susPoems, subFile, fileNum);
        }
    }

    if (newLines.length > 0 
        || errors.length > 0
        || susPoems.length > 0
    ) {
        subFile = await writeFiles(newLines, errors, susPoems, subFile, fileNum);
    }

    await closePage(page);
    await closeBrowser(browser);
};

const declancher = async () => {
    const linesFiles = await getDirJsons('../seedData/lines');

    const doneFiles = new Set();
    for (let i = 0; i < linesFiles.length; i++) {
        doneFiles.add(linesFiles[i].split('_')[0].replace('lines', ''));
    }
    const poemsLinksFiles = (await getDirJsons('../seedData/poemsLinks'))
                                .filter(file => {
                                    return file.startsWith('poem')
                                            && !doneFiles.has(
                                                file.replace('.json', '').replace('poems', '')
                                            )
                                });
    console.log(`You have ${poemsLinksFiles.length} files to scrap:`, poemsLinksFiles, '...');
    for (let i = 0; i < poemsLinksFiles.length; i++) {
        const poemsLinks = await getContentOfJsonFile(`../seedData/poemsLinks/${poemsLinksFiles[i]}`);
        await scrapLines(poemsLinks, poemsLinksFiles[i].replace('.json', '').replace('poems', ''));
    }
};
await declancher();