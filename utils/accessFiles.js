import fs from 'node:fs/promises';
import path from 'node:path';


export const getDirJsons = async (dirPath) => {
    try {
        const targetFolderPath = path.join(import.meta.dirname, dirPath);
        const folderContent = (await fs.readdir(targetFolderPath)).filter(ele => ele.endsWith('.json'));

        return folderContent;
    } catch (error) {
        console.log(error);
    }
}

export const getContentOfJsonFile = async (jsonPath) => {
    try {
        const filePath = path.join(import.meta.dirname, jsonPath);
        const content = await fs.readFile(filePath, 'utf-8');
        const json = JSON.parse(content);
        return json;
    } catch (error) {
        console.log(error);
    }
}