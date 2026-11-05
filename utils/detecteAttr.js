import topics from '../seedData/utils/topics.json' with { type: 'json' };
import poemsTypes from '../seedData/utils/poemsTypes.json' with { type: 'json' };
import seas from '../seedData/utils/seas.json' with { type: 'json' };
import qawafi from '../seedData/utils/quawafi.json' with { type: 'json' };
import eras from '../seedData/utils/eras.json' with { type: 'json' };
import countries from '../seedData/utils/countries.json' with { type: 'json' };

const map = new Map([
    ['topic_id', topics],
    ['type_id', poemsTypes],
    ['sea_id', seas],
    ['quafia_id', qawafi],
]);


export const resolveAttr = (attributes) => {
    const resolvedAtt = {};
    for (let i = 0; i < attributes.length; i++) {
        for (const [key, content] of map) {
            const target = content.find(object => {
                return object.name_ar === attributes[i] 
                       || object.aliases.some(alias => alias === attributes[i])
                       || object.name_en === attributes[i];
            });
            if (target) {
                resolvedAtt[key] = target.id;
                break;
            }
        }
    }
    let isSus = Object.keys(resolvedAtt).length !== attributes.length;
    if (isSus && resolvedAtt.type_id === 3 && resolvedAtt.sea_id == null) {
        resolvedAtt.sea_id = 5;
    }
    isSus = Object.keys(resolvedAtt).length !== attributes.length;
    for (const [key, ] of map) {
        if (!resolvedAtt[key]) {
            resolvedAtt[key] = null;
        }
    }

    return { resolvedAtt, isSus }

};