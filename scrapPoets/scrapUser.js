
const scrapUserPoetInfo = (main) => ({
    name_en: main.querySelector('.profile-handle-row > .profile-handle').textContent.replace(/[^a-zA-Z0-9]/g, ' ').replace('poet', '').trim(),
    name_ar: main.querySelector('#profile-name').textContent.trim(),
    bio: main.querySelector('.profile-bio-wrap > #profileBio').textContent.trim(),
    era_id: 11,
    country_id: main.querySelector('.profile-meta').firstElementChild.textContent.trim(),
    gender: 'male',
});


export const scrapUser = async (page) => {
    const poetInfo = await page.$eval('div.profile-details', scrapUserPoetInfo);
    return { poetInfo };
};