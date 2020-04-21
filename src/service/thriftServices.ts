import * as express from 'express'
import * as kr from "./gencode/AuxoftKeyReel";
import {IDatabase} from "./database";


export class LoggingServiceImpl implements kr.LoggingService.IHandler<express.Request> {
    public sendLog(logMessage: kr.ILogMessage, context?: express.Request): void | Promise<void> {
        return;
    }
}

export class HostStorageServiceImpl implements kr.HostStorageService.IHandler<express.Request> {

    protected database: IDatabase;


    public constructor(database: IDatabase) {
        this.database = database;
    }

    public addLoginData(
        request: kr.IAddLoginDataRequest,
        context: express.Request | undefined): kr.IAddLoginDataResponseArgs | Promise<kr.IAddLoginDataResponseArgs> {

        return <kr.IAddLoginDataResponseArgs>{};
    }

    public chooseSiteData(
        request: kr.IChooseSiteDataRequest,
        context: express.Request | undefined): kr.IChooseSiteDataResponseArgs | Promise<kr.IChooseSiteDataResponseArgs> {

        return <kr.IChooseSiteDataResponseArgs>{};
    }

    public deleteLoginData(
        request: kr.IDeleteLoginDataRequest,
        context: express.Request | undefined): kr.IDeleteLoginDataResponseArgs | Promise<kr.IDeleteLoginDataResponseArgs> {

        return <kr.IDeleteLoginDataResponseArgs>{};
    }

    public deleteSiteData(
        request: kr.IDeleteSiteDataRequest,
        context: express.Request | undefined): kr.IDeleteSiteDataResponseArgs | Promise<kr.IDeleteSiteDataResponseArgs> {

        return <kr.IDeleteSiteDataResponseArgs>{};
    }

    public generatePassword(
        request: kr.IGeneratePasswordRequest,
        context: express.Request | undefined): kr.IGeneratePasswordResponseArgs | Promise<kr.IGeneratePasswordResponseArgs> {

        return <kr.IGeneratePasswordResponseArgs>{};
    }

    public get2FACode(
        request: kr.IGet2FACodeRequest,
        context: express.Request | undefined): kr.IGet2FACodeResponseArgs | Promise<kr.IGet2FACodeResponseArgs> {

        return <kr.IGet2FACodeResponseArgs>{};
    }

    public getLoginData(
        request: kr.IGetLoginDataRequest,
        context: express.Request | undefined): kr.IGetLoginDataResponseArgs | Promise<kr.IGetLoginDataResponseArgs> {

        return <kr.IGetLoginDataResponseArgs>{};
    }

    public getSiteData(
        request: kr.IGetSiteDataRequest,
        context: express.Request | undefined): kr.IGetSiteDataResponseArgs | Promise<kr.IGetSiteDataResponseArgs> {

        return <kr.IGetSiteDataResponseArgs>{};
    }

    public getSiteDataList(
        request: kr.IGetSiteDataListRequest,
        context: express.Request | undefined): kr.IGetSiteDataListResponseArgs | Promise<kr.IGetSiteDataListResponseArgs> {

        return <kr.IGetSiteDataListResponseArgs>{};
    }

    public importSiteDataFromGoogle(
        request: kr.IImportSiteDataFromGoogleRequest,
        context: express.Request | undefined): kr.IImportSiteDataFromGoogleResponseArgs | Promise<kr.IImportSiteDataFromGoogleResponseArgs> {

        return <kr.IImportSiteDataFromGoogleResponseArgs>{};
    }

    public sendPing(
        request: kr.IPingTestRequest,
        context: express.Request | undefined): kr.IPongTestResponseArgs | Promise<kr.IPongTestResponseArgs> {

        return <kr.IPongTestResponseArgs>{};
    }

    public updateLoginData(
        request: kr.IUpdateLoginDataRequest,
        context: express.Request | undefined): kr.IUpdateLoginDataResponseArgs | Promise<kr.IUpdateLoginDataResponseArgs> {

        return <kr.IUpdateLoginDataResponseArgs>{};
    }
}
