import { getContentOfJsonFile, getDirJsons } from '../utils/accessFiles.js';
import { makeBrowser, makePage, closeBrowser, closePage } from '../utils/playwrightInit.js';
import fs from 'node:fs/promises';
import { scrapUserPoems } from './scrapUserPoems.js';
import { scrapCertifiedPoems } from './scrapCertifiedPoems.js';
import { removeDoubleLinks } from '../utils/removeDoubleLinks.js';

const getAvailableLinks = async () => {
    const poemsLinksFiles = (await getDirJsons('../seedData/poemsLinks')).filter(file => file.startsWith('poems'));
    const links = new Set();
    for (let i = 0; i < poemsLinksFiles.length; i++) {
        const content = await getContentOfJsonFile(`../seedData/poemsLinks/${poemsLinksFiles[i]}`);

        for (let j = 0; j < content.length; j++) {
            links.add(content[j].link);
        }
    }
    return links;
};

const writeFiles = async (newLinks, unfoundedLinks, susPoets, subFile, fileNum) => {
    console.log(`Start writing the file ${fileNum}_${subFile} ...`);

    await fs.writeFile(`./seedData/poemsLinks/poems${fileNum}_${subFile}.json`, JSON.stringify(newLinks, null, 2));
    newLinks.length = 0;

    if (unfoundedLinks.length > 0) {
        await fs.writeFile(`./seedData/poemsLinks/unfoundedLinks${fileNum}_${subFile}.json`, JSON.stringify(unfoundedLinks, null, 2));
        unfoundedLinks.length = 0;
    }

    if (susPoets.length > 0) {
        await fs.writeFile(`./seedData/poemsLinks/susPoets${fileNum}_${subFile}.json`, JSON.stringify(susPoets, null, 2));
        susPoets.length = 0;
    }

    console.log(`Done writing the file ${fileNum}_${subFile}.`);

    return subFile + 1;
};

const scrapPoemsLinks = async (poetsLinks, fileNum) => {
    const browser = await makeBrowser();
    let page = await makePage(browser);

    // ملاحظة: تأكد من طريقة إدارة globalPoemId إذا كنت ستشغل الملفات بشكل متوازي أو متتابع
    let globalPoemId = 124179; 
    const availableLinks = await getAvailableLinks();
    const tempLinks = [];
    const newLinks = [];

    const unfoundedLinks = [];
    const susPoets = [];
    
    let subFile = 1;

    for (let i = 0; i < poetsLinks.length; i++) {
        console.log(`Getting the link: ${poetsLinks[i].link}, ${i + 1} of ${poetsLinks.length} ${((i + 1) / poetsLinks.length).toFixed(4)} ...`);

        const isUser = poetsLinks[i].link.includes('/user/');
        let failed;
        const result = await page.goto(isUser ? `${poetsLinks[i].link}?tab=diwan` : poetsLinks[i].link, { timeout: 240_000 })
            .catch(error => (failed = error, null));
            
        if (failed || !result || !result.ok()) {
            unfoundedLinks.push(poetsLinks[i]);
            console.log('Aborted ... \n');
            continue;
        }

        const { poetPoems, unfoundedSubLinks, error = undefined } = isUser ?
            await scrapUserPoems(page)
                .catch(error => ({ poetPoems: [], unfoundedSubLinks: [], error: error }))
            : await scrapCertifiedPoems(page)
                .catch(error => ({ poetPoems: [], unfoundedSubLinks: [], error: error }));

        if (unfoundedSubLinks.length > 0) {
            unfoundedLinks.push({
                poetId: poetsLinks[i].poetId,
                mainLink: poetsLinks[i].link,
                subLinks: unfoundedSubLinks,
            });
        }
        if (poetPoems.length === 0) {
            susPoets.push({
                poetId: poetsLinks[i].poetId,
                link: poetsLinks[i].link,
                error,
            });
        }
        for (let j = 0; j < poetPoems.length; j++) {
            poetPoems[j].poetId = poetsLinks[i].poetId;
            tempLinks.push(poetPoems[j]);
        }

        if (i > 0 && i % 100 === 0) {
            console.log('\nrefreshing the page...');
            await closePage(page);
            page = await makePage(browser);
            console.log('refreshed.\n');
            removeDoubleLinks(tempLinks);
            
            // معالجة الروابط المجمعة حتى الآن وتنقيتها من الروابط الموجودة مسبقاً
            for (let k = 0; k < tempLinks.length; k++) {
                if (!availableLinks.has(tempLinks[k].link)) {
                    tempLinks[k].poemId = globalPoemId++;
                    newLinks.push(tempLinks[k]);
                    // تحديث availableLinks لمنع التكرار في الدفعات القادمة في نفس الجلسة
                    availableLinks.add(tempLinks[k].link); 
                }
            }
            tempLinks.length = 0; // تفريغ بعد المعالجة

            // الحفظ التلقائي وتفريغ الذاكرة
            if (newLinks.length >= 30_000) {
                subFile = await writeFiles(newLinks, unfoundedLinks, susPoets, subFile, fileNum);
            }
        }
    }

    // معالجة أي روابط متبقية في tempLinks بعد انتهاء الحلقة
    removeDoubleLinks(tempLinks);
    for (let k = 0; k < tempLinks.length; k++) {
        if (!availableLinks.has(tempLinks[k].link)) {
            tempLinks[k].poemId = globalPoemId++;
            newLinks.push(tempLinks[k]);
            availableLinks.add(tempLinks[k].link);
        }
    }
    tempLinks.length = 0;

    // حفظ المتبقي إن وجد
    if (newLinks.length > 0 || unfoundedLinks.length > 0 || susPoets.length > 0) {
        subFile = await writeFiles(newLinks, unfoundedLinks, susPoets, subFile, fileNum);
    }

    await closePage(page);
    await closeBrowser(browser);
};

const declancher = async () => {
    const poemsLinksDoneFiles = await getDirJsons('../seedData/poemsLinks');
    
    const doneFiles = new Set();
    for (let i = 0; i < poemsLinksDoneFiles.length; i++) {
        if (poemsLinksDoneFiles[i].startsWith('poems')) {
            doneFiles.add(poemsLinksDoneFiles[i].replace('poems', '').replace('.json', ''));
        }
    }

    const poetsLinksFiles = (await getDirJsons('../seedData/poetsLinks'))
        .filter(file => {
            return file.startsWith('poets')
                && !doneFiles.has(
                    file.replace('.json', '').replace('poets', '')
                );
        });

    console.log(`You have ${poetsLinksFiles.length} files to scrap:`, poetsLinksFiles, '...');

    for (let i = 0; i < poetsLinksFiles.length; i++) {
        const fileNum = poetsLinksFiles[i].replace('.json', '').replace('poets', '');
        const poetsLinks = await getContentOfJsonFile(`../seedData/poetsLinks/${poetsLinksFiles[i]}`);
        await scrapPoemsLinks(poetsLinks, fileNum);
    }
};

await declancher();