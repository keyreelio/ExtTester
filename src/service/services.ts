import fs from "fs";
import * as express from 'express'
import * as kr from "../thrift/gencode/AuxoftKeyReel";

import {loggingServiceJSLogger as Ll, hostServiceJSLogger as Lh} from "../common/log.config";
import { DBAccount } from './dbaccount';
import * as thrift from "@creditkarma/thrift-server-core";


export class LoggingServiceImpl implements kr.LoggingService.IHandler<express.Request> {

    public setExtLogFilePath: string | undefined = undefined;


    public sendLog(logMessage: kr.ILogMessage, context?: express.Request): void | Promise<void> {

        if (logMessage.message === undefined) return;
        let message = Buffer.from(logMessage.message, 'base64').toString();
        let tags = logMessage.tags === undefined ? "" : logMessage.tags;
        let contextName = logMessage.contextName === undefined ? "" : logMessage.contextName;
        switch (logMessage.level) {
            case kr.LogLevel.VERBOSE:
                this.log(`| VERB | ${contextName}: [${tags}] ${message}`);
                break;
            case kr.LogLevel.DEBUG:
                this.log(`| DEBG | ${contextName}: [${tags}] ${message}`);
                break;
            case kr.LogLevel.INFO:
                this.log(`| INFO | ${contextName}: [${tags}] ${message}`);
                break;
            case kr.LogLevel.WARNING:
                this.log(`| WARN | ${contextName}: [${tags}] ${message}`);
                break;
            case kr.LogLevel.ERROR:
                this.log(`| ERRR | ${contextName}: [${tags}] ${message}`);
                break;
        }
    }

    protected log(message: string) {
        if (this.setExtLogFilePath === undefined) return;
        let date = `${(new Date()).toLocaleTimeString()}`;
        fs.writeFileSync(this.setExtLogFilePath, `${date}${message}\n`, {flag: "a"});
    }
}

export class HostStorageServiceImpl implements kr.HostStorageService.IHandler<express.Request> {

    protected paused: boolean;
    protected unauthorized: boolean;
    protected deviceOfflined: boolean;

    protected nextResponseId = 0;


    public onGetAccount: ((path: string) => DBAccount | undefined) | undefined = undefined;
    public onAddAccount: ((path: string, account: DBAccount) => void) | undefined = undefined;


    public constructor(paused: boolean, unauthorized: boolean, deviceOfflined: boolean) {
        this.paused = paused;
        this.unauthorized = unauthorized;
        this.deviceOfflined = deviceOfflined;
    }

    public sendPing(
        request: kr.IPingTestRequest,
        context: express.Request | undefined): kr.IPongTestResponseArgs | Promise<kr.IPongTestResponseArgs> {

        let response = new kr.PongTestResponse();
        response.info = this.run(request.info, () => {

            let flags: number = Number(kr.LOG_LEVEL_VERBOSE);
            flags = flags | Number(this.deviceOfflined ? kr.DEVICE_STATE_OFFLINE : kr.DEVICE_STATE_ONLINE);

            response.extendedMode = false;
            response.flags = new thrift.Int64(flags);
            response.clientSecret = '939b3c15-a7a0-4ec1-8667-75cbc5d4cd4f';
        });

        return response;
    }

    public getSiteData(
        request: kr.IGetSiteDataRequest,
        context: express.Request | undefined): kr.IGetSiteDataResponseArgs | Promise<kr.IGetSiteDataResponseArgs> {

        Lh.debug("getSiteData");
        Lh.trace(`siteUrl: ${request.siteUrl}`);

        let response = new kr.GetSiteDataResponse();
        response.info = this.run(request.info, () => {
            if (request.siteUrl === undefined) {
                throw Errors.NotFound();
            }

            let url = new URL(request.siteUrl);

            if (this.onGetAccount === undefined) {
                throw Errors.NotFound();
            }

            let account = this.onGetAccount(url.host);
            if (account === undefined) {
                throw Errors.NotFound();
            }

            response.record = new kr.SiteData({
                siteUrl: request.siteUrl,
                domain: url.host,
                loginData: new Array<kr.ILoginDataArgs>(
                    new kr.LoginData({
                        login: account.username
                    })
                )
            });
        });

        return response;
    }

    public chooseSiteData(
        request: kr.IChooseSiteDataRequest,
        context: express.Request | undefined): kr.IChooseSiteDataResponseArgs | Promise<kr.IChooseSiteDataResponseArgs> {

        Lh.debug("chooseSiteData");
        Lh.trace(`siteUrl: ${request.siteUrl}`);

        let response = new kr.ChooseSiteDataResponse();
        response.info = this.run(request.info, () => {
            if (request.accounts !== undefined && request.accounts.length > 0) {
                response.choosedAccount = request.accounts[0];
            }
        });

        return response;
    }

    public addLoginData(
        request: kr.IAddLoginDataRequest,
        context: express.Request | undefined): kr.IAddLoginDataResponseArgs | Promise<kr.IAddLoginDataResponseArgs> {

        Lh.debug("addLoginData");
        Lh.trace(`siteUrl: ${request.siteUrl}`);

        let response = new kr.AddLoginDataResponse();
        response.info = this.run(request.info, () => {
            if (request.siteUrl === undefined || request.loginData === undefined) {
                throw Errors.NotFound();
            }

            let url = new URL(request.siteUrl);

            let account = new DBAccount();
            account.username = request.loginData.login;
            account.password = Buffer.from(request.loginData.password === undefined ? "" : request.loginData.password, 'base64').toString();

            if (this.onAddAccount !== undefined) {
                this.onAddAccount(url.host, account);
            }
        });

        return response;
    }

    public getLoginData(
        request: kr.IGetLoginDataRequest,
        context: express.Request | undefined): kr.IGetLoginDataResponseArgs | Promise<kr.IGetLoginDataResponseArgs> {

        Lh.debug("getLoginData");
        Lh.trace(`siteUrl: ${request.siteUrl}`);

        let response = new kr.GetLoginDataResponse();
        response.info = this.run(request.info, () => {
            if (request.siteUrl === undefined || request.login === undefined) {
                throw Errors.NotFound();
            }

            let url = new URL(request.siteUrl);

            if (this.onGetAccount === undefined) {
                throw Errors.NotFound();
            }

            let account = this.onGetAccount(url.host);
            if (account === undefined || account.username === undefined || account.username !== request.login) {
                throw Errors.NotFound();
            }

            response.data = new kr.LoginData({
                login: account.username,
                password: Buffer.from(account.password === undefined ? "" : account.password).toString('base64')
            });
        });

        return response;
    }


    public updateLoginData(
        request: kr.IUpdateLoginDataRequest,
        context: express.Request | undefined): kr.IUpdateLoginDataResponseArgs | Promise<kr.IUpdateLoginDataResponseArgs> {

        let response = new kr.UpdateLoginDataResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }

    public deleteLoginData(
        request: kr.IDeleteLoginDataRequest,
        context: express.Request | undefined): kr.IDeleteLoginDataResponseArgs | Promise<kr.IDeleteLoginDataResponseArgs> {

        let response = new kr.DeleteLoginDataResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }

    public get2FACode(
        request: kr.IGet2FACodeRequest,
        context: express.Request | undefined): kr.IGet2FACodeResponseArgs | Promise<kr.IGet2FACodeResponseArgs> {

        let response = new kr.Get2FACodeResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }

    public deleteSiteData(
        request: kr.IDeleteSiteDataRequest,
        context: express.Request | undefined): kr.IDeleteSiteDataResponseArgs | Promise<kr.IDeleteSiteDataResponseArgs> {

        let response = new kr.DeleteSiteDataResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }

    public getSiteDataList(
        request: kr.IGetSiteDataListRequest,
        context: express.Request | undefined): kr.IGetSiteDataListResponseArgs | Promise<kr.IGetSiteDataListResponseArgs> {

        let response = new kr.GetSiteDataListResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }

    public importSiteDataFromGoogle(
        request: kr.IImportSiteDataFromGoogleRequest,
        context: express.Request | undefined): kr.IImportSiteDataFromGoogleResponseArgs | Promise<kr.IImportSiteDataFromGoogleResponseArgs> {

        let response = new kr.ImportSiteDataFromGoogleResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }

    public generatePassword(
        request: kr.IGeneratePasswordRequest,
        context: express.Request | undefined): kr.IGeneratePasswordResponseArgs | Promise<kr.IGeneratePasswordResponseArgs> {

        let response = new kr.GeneratePasswordResponse();
        response.info = this.run(request.info, () => {
        });

        return response;
    }


    protected run(requestInfo: kr.IRequestInfo | undefined, action: () => void): kr.ResponseInfo {
        let info = new kr.ResponseInfo({
            contextName: requestInfo === undefined ? "" : requestInfo.contextName,
            requestId: requestInfo === undefined ? "" : requestInfo.id,
            timeStampUtc: Date.now() / 1000,
            id: `${this.nextResponseId++}`
        });

        try {
            if (this.paused) {
                throw Errors.Paused();
            }
            if (this.unauthorized) {
                throw Errors.NotAuthorized();
            }

            action();

        } catch (e) {
            if (e instanceof kr.Error) {
                Lh.warn(`run error: ${e.debugMessage}`);
            } else {
                Lh.warn(`run exception: ${e}`);
            }
            info.error = e;
        }

        return info;
    }
}

class Errors {
    public static Paused(): kr.Error {
        return new kr.Error({
            category: kr.ErrorCategory.INTERNAL_ERROR,
            id: kr.ErrorCode.PAUSED,
            debugMessage: kr.EDM_PAUSED
        });
    }
    public static NotAuthorized(): kr.Error {
        return new kr.Error({
            category: kr.ErrorCategory.NOT_AUTHORIZED,
            id: kr.ErrorCode.CLIENT_NOT_AUTHORIZED,
            debugMessage: kr.EDM_CLIENT_NOT_AUTHORIZED
        });
    }
    public static NotFound(): kr.Error {
        return new kr.Error({
            category: kr.ErrorCategory.NOT_FOUND,
            id: kr.ErrorCode.ACCOUNT_NOT_FOUND,
            debugMessage: kr.EDM_ACCOUNT_NOT_FOUND
        });
    }
}
