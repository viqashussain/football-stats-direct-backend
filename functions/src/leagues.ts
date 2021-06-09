import * as request from 'request';
import caseless = require('caseless');
import { ResponseAsJSON } from 'request';
import { leagues } from './data';
import * as functions from 'firebase-functions';
import { getLeagueSeasonYear, updateOrCreateData } from './firebase-db';

/////// DEPLOYABLE FUNCTIONS ////////

export const tetsUpdateLeagues = functions.https.onCall(async (req: { data: any }, context): Promise<any> => {
    await updateLeagues(leagues[0].id, leagues[0].name);
})

export const scheduledFunctionUpdateLeagues = functions.pubsub.schedule('30 0-23 * * *').onRun(async (context) => {
    leagues.forEach(async x => {
        await updateLeagues(x.id, x.name);
    })
});

export const scheduledFunctionGetCurrentLeagueSeasonYear = functions.pubsub.schedule('0 21 * * *').onRun(async (context) => {
    await getCurrentLeagueSeasonYearForLeague();
});

const getCurrentLeagueSeasonYearForLeague = async () => {
    let getResponse: RequestIncomingMessage;
    await new Promise((resolve: any) => request.get(
        `https://api-football-v1.p.rapidapi.com/v3/leagues`,
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

    leagues.forEach(async x => {
        const leagueSeasonYear = JSON.parse(getResponse!.body).response.find((y: any) => y.league.id === x.id).seasons.pop().year;
        await updateOrCreateData('leaguesSeason', x.id.toString(), { currentLeagueSeason: leagueSeasonYear });
    });
}

const updateLeagues = async (leagueId: number, league: string) => {
    let getResponse: RequestIncomingMessage;
    const leagueSeasonYear = await getLeagueSeasonYear(leagueId);
    await new Promise((resolve: any) => request.get(
        `https://api-football-v1.p.rapidapi.com/v3/standings?season=${leagueSeasonYear}&league=${leagueId}`,
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

    await updateOrCreateData('leagues', league, JSON.parse(getResponse!.body));
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