import * as functions from 'firebase-functions';
import * as request from 'request';
import caseless = require('caseless');
import { ResponseAsJSON } from 'request';
import { leagues } from './data';
import { getLeagueSeasonYear, updateOrCreateData } from './firebase-db';

/////// DEPLOYABLE FUNCTIONS ////////
export const scheduledFunctionUpdateFixtures = functions.pubsub.schedule('30 0-23 * * *').onRun(async (context) => {
    leagues.forEach(async league => {
        await updateFixtures(league.id, league.name);
    });
});

const updateFixtures = async (leagueId: number, leagueName: string) => {
    let getResponse: RequestIncomingMessage;
    const leagueSeasonYear = await getLeagueSeasonYear(leagueId);
    await new Promise((resolve: any) => request.get(
        `https://api-football-v1.p.rapidapi.com/v3/fixtures?season=${leagueSeasonYear}&league=${leagueId}`,
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

    const processedData = processFixtureData(JSON.parse(getResponse!.body).response);

    await updateOrCreateData('fixtures', leagueName, processedData);
};

// this function is used to transform the data into a more preferred/managable state
function processFixtureData(jsonResponse: any) {
    let finalData: any[] = [];
    const cumulativePointsTracker: any = {};

    jsonResponse.forEach((x: any) => {
        debugger;
  
          const round = x.league.round;
          if (!finalData.find(x => x.round === round))
          {
            finalData.push({round});
          }
          const roundIndex = finalData.findIndex(x => x.round === round);
  
  
          const awayTeam = x.teams.away.name;
          let awayTeamPoints = x.teams.away.winner === true ? 3 : x.teams.away.winner === false ? 0 : 1;
  
          if (!cumulativePointsTracker[awayTeam]) {
              cumulativePointsTracker[awayTeam] = {};
              cumulativePointsTracker[awayTeam].points = 0;
          }
          cumulativePointsTracker[awayTeam].points += awayTeamPoints;
  
  
          //const awayTeamObject = { round, teamName: awayTeam, points: cumulativePointsTracker[awayTeam].points };
          finalData[roundIndex][awayTeam] = cumulativePointsTracker[awayTeam].points;
  
          const homeTeam = x.teams.home.name;
          let homeTeamPoints = x.teams.home.winner === true ? 3 : x.teams.home.winner === false ? 0 : 1;
  
          if (!cumulativePointsTracker[homeTeam]) {
              cumulativePointsTracker[homeTeam] = {};
              cumulativePointsTracker[homeTeam].points = 0;
          }
  
          cumulativePointsTracker[homeTeam].points += homeTeamPoints;
  
          //const homeTeamObject = { round, teamName: homeTeam, points: cumulativePointsTracker[homeTeam].points };
          finalData[roundIndex][homeTeam] = cumulativePointsTracker[homeTeam].points;
  
          //finalData.push(awayTeamObject);
          //finalData.push(homeTeamObject); 
      });
  
      const groupedData = groupBy(finalData, 'round');
      const processedData: any = processData(groupedData);

    return processedData;
}

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

const groupBy = function (xs: any, key: any) {
    if (!xs) {
        return;
    }
    return xs.reduce(function (rv: any, x: any) {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};

const processData = function (data: any) {
    const finalData: any = [];
    for (let key in data) {
        data[key].map((x: any) => {
            x[x.teamName] = x.points
        });
        finalData.push(data[key]);
    }

    return [].concat.apply([], finalData);;
}