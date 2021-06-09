import { db } from './config';
import * as functions from 'firebase-functions';

export const updateOrCreateData = async (dataType: string, name: string, data: Object) => {

    try {
        return await db.collection(dataType).doc(name).set( { data: JSON.stringify(data) } );
    }
    catch (e) {
        throw new functions.https.HttpsError('unknown', `Error: ${e.stack}`);
    }
};

export const getLeagueSeasonYear = async (leagueId: number): Promise<any> => {
    return await db.collection('leaguesSeason').doc(leagueId.toString()).get().then(doc => JSON.parse(doc.data()!.data).currentLeagueSeason);
};