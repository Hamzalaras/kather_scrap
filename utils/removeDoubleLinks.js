export const removeDoubleLinks = (arr) => {
    for (let i = 0; i < arr.length - 1; i++) {

        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i].link === arr[j].link) {
                arr[j] = arr[arr.length - 1];
                arr.length = arr.length - 1;
                j--;
            }
        }
    }
    return arr;
};