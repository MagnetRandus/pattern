import axios, { AxiosResponse } from 'axios';
import natural, { stopwords } from 'natural';
const readline = require('readline');

import * as fs from 'fs';

interface iOmdbApi {
    key: string
}

const path = require('path'); 
const scriptPath = process.argv[1];
const scriptDirectory = path.dirname(scriptPath);
const data = JSON.parse(fs.readFileSync(`${scriptDirectory}/filelist.json`, 'utf8')) as Array<string>;
const omdbapi = JSON.parse(fs.readFileSync(`${scriptDirectory}/../private/omdbapi.json`, 'utf8')) as iOmdbApi;

const tokenizer = new natural.WordTokenizer();

async function checkOnlineDb(titlePart: string, year: number): Promise<AxiosResponse<omdbResponse>> {
    const url = new URL('http://www.omdbapi.com/');
    const params = { apikey: omdbapi.key, s: titlePart, r: 'json', y: String(year), type: 'movie' };
    return axios.get<omdbResponse>(url.href, { params });
}

async function main(): Promise<void> {
    try {

        const titles = new Array<string[]>();

        data.map(x => {
            try {
                const filenameOnly = x.substring(0, x.lastIndexOf('.'));
                const rx4DigitNr = /\b\d{4}\b/g;
                const year = filenameOnly.match(rx4DigitNr);

                if (year !== null && (Number(year?.[0]) > 1920 && Number(year?.[0]) <= new Date().getFullYear())) { //Check if not just some bs 4 digit number

                    const yyyy = String(year?.[0]);
                    const filenameNoYear = filenameOnly.replace(yyyy, '');
                    const fNameClean = filenameNoYear.replace(/[^a-zA-Z]/g, ' ').trim();
                    let tkzd = tokenizer.tokenize(fNameClean.toLowerCase())?.filter(word => !stopwords.includes(word))!;
                    tkzd = [yyyy, ...tkzd];
                    titles.push(tkzd);

                } else {
                    console.log(`Rejecting [${filenameOnly}]`);
                }

            } catch (error) {
                console.dir(error);
            }
        });

        for await (const title of titles) {
            const titleFour = title.slice(0, 4);
            const [yyyy, ...words] = titleFour;
            const [firstWord] = words;

            const { config, data, headers, status, statusText, request } = await checkOnlineDb(firstWord, Number(yyyy));

            if (status == 200) {
                const { Search } = data;

                console.log(`\n\n[${title}-${yyyy}] :`);
                let foundTitle = ``;
                let lastHitCount = 0;

                if (Search !== null && typeof Search !== 'undefined') {
                    Search.map(x => {
                        let hitCount = 0;
                        let tkzdN = tokenizer.tokenize(x.Title.toLowerCase())?.filter(word => !stopwords.includes(word))!;
                        for (let index = 0; index < words.length; index++) {
                            if (index <= tkzdN.length && (words[index] == tkzdN[index])) {
                                hitCount++
                            }
                        }
                        
                        if (hitCount > lastHitCount) {
                            lastHitCount = hitCount;
                            foundTitle = `${x.Title} (${yyyy})`;
                        }
                        // console.log(`hit count: ${hitCount}: ${x.Title}`);

                    });
                    console.log(`MATCHED: ${title} to [${foundTitle}]`);
                } else {
                    console.log(`None found: ${title}`);
                }

            }
            else
                console.log(`ERROR: ${statusText}`);
        }
        // const r = checkOnlineDb(wordsd[0], Number(year));

        // const movieResults = await Promise.all(mResults);
        // const xx = movieResults.map(x => x.data);

        // let r = new Array<any>();


        // console.log('done');




        console.log('done');

    } catch (error) {
        console.log(`ERROR:`);
        console.dir(error);
    }
}

main();


