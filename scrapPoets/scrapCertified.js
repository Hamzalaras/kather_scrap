const scrapCertifiedPoet = (main) => ({
    name_en: main.querySelector('span.poet-identity-username').textContent.replace(/[^a-zA-Z0-9]/g, ' ').replace('poet', '').trim(),
    name_ar: main.querySelector('div.poet-identity-primary > .poet-name-wrap > h2').textContent.trim(),
    bio: Array.from(main.querySelectorAll('div.poet-profile-about > span.poet-bio > span.poet-bio-line'))
            .map(ele => ele.textContent.trim())
            .filter(Boolean)
            .join('\n'),
    era_id: main.querySelector('a.poet-profile-era').textContent.trim(),
    country_id: main.querySelector('a.poet-profile-era').textContent.trim(),
    gender: 'male',
});

export const scrapCertified = async (page) => {
    const poetInfo = await page.$eval('aside.poet-profile-summary', scrapCertifiedPoet);

    return { poetInfo };
};