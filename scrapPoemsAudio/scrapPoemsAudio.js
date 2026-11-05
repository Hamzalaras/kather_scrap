import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { getContentOfJsonFile } from '../utils/accessFiles.js';


const scrapPoemsAudio = async (audioLinks) => {

    const errors = [];
    audioLinks = audioLinks.filter(ele => ele.poemId);

    const length = audioLinks.length;

    for (let i = 0; i < length; i++) {
        const currentLink = audioLinks[i];


        const end = currentLink.audioLink.endsWith('.mp3') ? 'mp3' : 'webm'
        const filePath = `./data3/poemsAudio/audio1/${currentLink.poemAudioId}_${currentLink.poemId}.${end}`;
        console.log(`Getting the audio of the poem: ${currentLink.audioLink}, ${i + 1} of ${length} ${((i + 1) / length ).toFixed(4)}`);

        let failed;
        const response = await fetch(currentLink.audioLink)
                            .catch(error => (failed = error, null));

        if (failed || !response || !response.ok) {
            console.log('\nAborted...\n');
            errors.push({ ...currentLink, failed: failed?.message });
            continue;
        }

        await pipeline(
            Readable.fromWeb(response.body),
            fs.createWriteStream(filePath)
        ).catch(error => (failed = error));

        if (failed) {
            console.log('\nAborted...\n');
            errors.push({ ...currentLink, failed: failed?.message });
            continue;
        } 
    }

    if (errors.length > 0) {
        await fsPromises.writeFile(`./data3/poemsAudioLinks/errors1_new.json`, JSON.stringify(errors, null, 2));
        errors.length = 0;
    }
    console.log('Done writing the file.\n');
};

const declancher = async () => {
    const audioLinks = await getContentOfJsonFile('../../data3/poemsAudioLinks/errors1.json');
    await scrapPoemsAudio(audioLinks);
};
await declancher();