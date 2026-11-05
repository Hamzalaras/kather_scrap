import { chromium } from 'playwright-extra';
import stealthPlugin from 'puppeteer-extra-plugin-stealth';

chromium.use(stealthPlugin());

export const makeBrowser = async () => {
    try {
        const browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ],
        });
        return browser;
    } catch (error) {
        console.error(`Error in ${import.meta.filename}, makeBrowser:`, error);
        process.exit(1);
    }
};

export const makePage = async (browser) => {
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            viewport: { width: 1366, height: 768 },
            locale: 'ar-SA',
            extraHTTPHeaders: {
                'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
            }
        });

        const page = await context.newPage();
        return page;
    } catch (error) {
        console.error(`Error in ${import.meta.filename}, makePage:`, error);
        process.exit(1);
    }
};

export const closePage = async (page) => {
    try {
        if (page && !page.isClosed()) {
            await page.close();
        }
    } catch (error) {
        console.error(`Error in ${import.meta.filename}, closePage:`, error);
        process.exit(1);
    }
};

export const closeBrowser = async (browser) => {
    try {
        if (browser && browser.isConnected()) {
            await browser.close();
        }
    } catch (error) {
        console.error(`Error in ${import.meta.filename}, closeBrowser:`, error);
        process.exit(1);
    }
};