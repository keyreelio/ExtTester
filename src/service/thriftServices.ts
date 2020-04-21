import * as express from 'express'
import * as kr from "./gencode/AuxoftKeyReel";
import {IDatabase} from "./database";

import {loggingServiceJSLogger as Ll, hostServiceJSLogger as Lh} from "../common/log.config";


export class LoggingServiceImpl implements kr.LoggingService.IHandler<express.Request> {
    public sendLog(logMessage: kr.ILogMessage, context?: express.Request): void | Promise<void> {

        switch (logMessage.level) {
            case kr.LogLevel.VERBOSE:
                Ll.trace(`${logMessage.message}`);
                break;
            case kr.LogLevel.DEBUG:
                Ll.debug(`${logMessage.message}`);
                break;
            case kr.LogLevel.INFO:
                Ll.info(`${logMessage.message}`);
                break;
            case kr.LogLevel.WARNING:
                Ll.warn(`${logMessage.message}`);
                break;
            case kr.LogLevel.ERROR:
                Ll.warn(`${logMessage.message}`);
                break;
        }
    }
}

export class HostStorageServiceImpl implements kr.HostStorageService.IHandler<express.Request> {

    protected database: IDatabase;
    protected paused: boolean;
    protected unauthorized: boolean;
    protected deviceOfflined: boolean;

    protected nextResponsetId = 0;


    public constructor(database: IDatabase, paused: boolean, unauthorized: boolean, deviceOfflined: boolean) {
        this.database = database;
        this.paused = paused;
        this.unauthorized = unauthorized;
        this.deviceOfflined = deviceOfflined;
    }

    public getSiteData(
        request: kr.IGetSiteDataRequest,
        context: express.Request | undefined): kr.IGetSiteDataResponseArgs | Promise<kr.IGetSiteDataResponseArgs> {

        let response = new kr.GetSiteDataResponse();
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

    public chooseSiteData(
        request: kr.IChooseSiteDataRequest,
        context: express.Request | undefined): kr.IChooseSiteDataResponseArgs | Promise<kr.IChooseSiteDataResponseArgs> {

        let response = new kr.ChooseSiteDataResponse();
        response.info = this.run(request.info, () => {

        });

        return response;
    }

    public getLoginData(
        request: kr.IGetLoginDataRequest,
        context: express.Request | undefined): kr.IGetLoginDataResponseArgs | Promise<kr.IGetLoginDataResponseArgs> {

        let response = new kr.GetLoginDataResponse();
        response.info = this.run(request.info, () => {

        });

        return response;
    }

    public addLoginData(
        request: kr.IAddLoginDataRequest,
        context: express.Request | undefined): kr.IAddLoginDataResponseArgs | Promise<kr.IAddLoginDataResponseArgs> {

        let response = new kr.AddLoginDataResponse();
        response.info = this.run(request.info, () => {

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

    public importSiteDataFromGoogle(
        request: kr.IImportSiteDataFromGoogleRequest,
        context: express.Request | undefined): kr.IImportSiteDataFromGoogleResponseArgs | Promise<kr.IImportSiteDataFromGoogleResponseArgs> {

        let response = new kr.ImportSiteDataFromGoogleResponse();
        response.info = this.run(request.info, () => {});

        return response;
    }

    public generatePassword(
        request: kr.IGeneratePasswordRequest,
        context: express.Request | undefined): kr.IGeneratePasswordResponseArgs | Promise<kr.IGeneratePasswordResponseArgs> {

        return <kr.IGeneratePasswordResponseArgs>{};
    }

    public sendPing(
        request: kr.IPingTestRequest,
        context: express.Request | undefined): kr.IPongTestResponseArgs | Promise<kr.IPongTestResponseArgs> {

        let response = new kr.PongTestResponse();
        response.info = this.run(request.info, () => {

            response.extendedMode = false;
            response.flags = this.deviceOfflined ? kr.DEVICE_STATE_OFFLINE : kr.DEVICE_STATE_ONLINE;
            response.clientSecret = '939b3c15-a7a0-4ec1-8667-75cbc5d4cd4f';
        });

        return response;
    }

    protected run(requestInfo: kr.IRequestInfo | undefined, action: () => void): kr.ResponseInfo {
        let info = new kr.ResponseInfo({
            contextName: requestInfo === undefined ? "" : requestInfo.contextName,
            requestId: requestInfo === undefined ? "" : requestInfo.id,
            timeStampUtc: Date.now() / 1000,
            id: `${this.nextResponsetId++}`
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
            Lh.warn(`run exception: ${e}`);
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
}

/*
    class Errors
    {
        public static Error DeviceNotFound => new Error()
        {
            Category = ErrorCategory.NOT_FOUND,
            Id = (long)ErrorCode.DEVICE_NOT_FOUND,
            DebugMessage = protocolsConstants.EDM_DEVICE_NOT_FOUND
        };

        public static Error DeviceNotPaired => new Error()
        {
            Category = ErrorCategory.NOT_FOUND,
            Id = (long)ErrorCode.DEVICE_NOT_PAIRED,
            DebugMessage = protocolsConstants.EDM_DEVICE_NOT_PAIRED
        };

        public static Error DeviceNotAvailable => new Error()
        {
            Category = ErrorCategory.NOT_FOUND,
            Id = (long)ErrorCode.DEVICE_NOT_AVAILABLE,
            DebugMessage = protocolsConstants.EDM_DEVICE_NOT_AVAILABLE
        };

        public static Error DuplicatedAccount => new Error()
        {
            Category = ErrorCategory.INTERNAL_ERROR,
            Id = (long)ErrorCode.ACCOUNT_DUPLICATED,
            DebugMessage = protocolsConstants.EDM_ACCOUNT_DUPLICATED
        };

        public static Error RequestTimedOut => new Error()
        {
            Category = ErrorCategory.PERMISSION_DENIED,
            Id = (long)ErrorCode.USER_TIMEOUT,
            DebugMessage = protocolsConstants.EDM_USER_TIMEOUT
        };

        public static Error RequestCanceledByUser => new Error()
        {
            Category = ErrorCategory.PERMISSION_DENIED,
            Id = (long)ErrorCode.USER_CANCELED,
            DebugMessage = protocolsConstants.EDM_USER_CANCELED
        };

        public static Error InternalException(Exception exception)
        {
            return new Error()
            {
                Category = ErrorCategory.INTERNAL_ERROR,
                Id = (long)ErrorCode.APP_EXCEPTION,
                DebugMessage = $"exception: {exception.Message}"
            };
        }
    }

 */