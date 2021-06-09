import * as functions from 'firebase-functions';
import * as request from 'request';
import caseless = require('caseless');
import { ResponseAsJSON } from 'request';
import { leagues, players } from './data';
import { getLeagueSeasonYear, updateOrCreateData } from './firebase-db';

/////// DEPLOYABLE FUNCTIONS ////////
export const scheduledFunctionUpdateAllPlayersPL = functions.pubsub.schedule('0 23 * * *').onRun(async (context) => {
    await updateAllPlayers(39);
});

export const scheduledFunctionUpdateAllPlayersLaLiga = functions.pubsub.schedule('10 23 * * *').onRun(async (context) => {
    await updateAllPlayers(140);
});

// export const testscheduledFunctionUpdateAllPlayersSerieA = functions.pubsub.schedule('every 1 hours').onRun(async (context) => {
export const scheduledFunctionUpdateAllPlayersSerieA = functions.pubsub.schedule('20 23 * * *').onRun(async (context) => {
    await updateAllPlayers(135);
});

export const scheduledFunctionUpdateAllPlayersBundesliga = functions.pubsub.schedule('30 23 * * *').onRun(async (context) => {
    await updateAllPlayers(78);
});

export const scheduledFunctionUpdateAllPlayersLigue1 = functions.pubsub.schedule('40 23 * * *').onRun(async (context) => {
    await updateAllPlayers(61);
});

export const scheduledFunctionUpdatePlayers = functions.pubsub.schedule('0 22 * * *').onRun(async (context) => {
    players.forEach(async player => {
        leagues.forEach(async league => {
            await updatePlayers(player.url, league.id, player.name);
        })
    })
});

const updateAllPlayers = async (leagueId: number) => {
    const finalData = await iterativelyGetPlayers(leagueId, 1, []);

    // store a maximum of 500 playeres in a single document
    const numberOfIterations = parseInt(Math.ceil((finalData.length / 500)).toFixed(0));

    for (let i = 0; i < numberOfIterations; i++)
    {
        const itemsToStore = finalData.slice(i * 500, (i + 1) * 500);
        await updateOrCreateData('allPlayers', `${leagueId}-${i}`, itemsToStore);
    }
};

const iterativelyGetPlayers = async (leagueId: number, pageNumber: number, finalData: any[]) => {
    //delay the request in order to stay within the rapid api quota limit of 30 per min.
    await sleep(3000);

    let getResponse: RequestIncomingMessage;
    const leagueSeasonYear = await getLeagueSeasonYear(leagueId);
    await new Promise((resolve: any) => request.get(
        `https://api-football-v1.p.rapidapi.com/v3/players?season=${leagueSeasonYear}&league=${leagueId}&page=${pageNumber}`,
        {
            'headers': {
                'x-rapidapi-key': '8cdff61333mshda0c85114bfdbdep18ff1ejsn7e52e5f6effe',
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        },
        function (error: any, response: any, body: any) {
            getResponse = response;
            resolve();
        }
    ));

    if (getResponse!.statusCode !== 200) {
        throw new functions.https.HttpsError('unknown', `Error: ${getResponse!.body}`);
    }

    const jsonResponse = JSON.parse(getResponse!.body)
    const players = jsonResponse.response;
    finalData = finalData.concat(players);

    // more players left to get
    if (jsonResponse.paging.current !== jsonResponse.paging.total) {
        finalData = await iterativelyGetPlayers(leagueId, jsonResponse.paging.current + 1, finalData);
    }

    return finalData;
}

const updatePlayers = async (url: string, leagueId: number, statsName: string) => {
    let getResponse: RequestIncomingMessage;
    const leagueSeasonYear = await getLeagueSeasonYear(leagueId);
    await new Promise((resolve: any) => request.get(
        `${url}?season=${leagueSeasonYear}&league=${leagueId}`,
        {
            'headers': {
                'x-rapidapi-key': '8cdff61333mshda0c85114bfdbdep18ff1ejsn7e52e5f6effe',
                'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
            }
        },
        function (error: any, response: any, body: any) {
            getResponse = response;
            resolve();
        }
    ))

    if (getResponse!.statusCode !== 200) {
        throw new functions.https.HttpsError('unknown', `Error: ${getResponse!.body}`);
    }

    await updateOrCreateData('playerStats', `${statsName}-${leagueId}`, JSON.parse(getResponse!.body));
};

export interface RequestIncomingMessage {
    statusCode: number;
    statusMessage: string;
    request: Request;
    body: any; // Buffer, string, stream.Readable, or a plain object if `json` was truthy
    caseless: caseless.Caseless; // case-insensitive access to headers
    toJSON(): ResponseAsJSON;

    timingStart?: number;
    elapsedTime?: number;
    timings?: {
        socket: number;
        lookup: number;
        connect: number;
        response: number;
        end: number;
    };
    timingPhases?: {
        wait: number;
        dns: number;
        tcp: number;
        firstByte: number;
        download: number;
        total: number;
    }
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}