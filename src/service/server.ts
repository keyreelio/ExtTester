import express from 'express';
import * as bodyParser from 'body-parser'
import * as kr from "../thrift/gencode/AuxoftKeyReel";

import { ThriftServerExpress } from '@creditkarma/thrift-server-express'
import {LoggingServiceImpl, HostStorageServiceImpl} from "./services";
import http from "http";
import {DBAccount} from "./dbaccount";


export class Server {

    protected HostStoragePort = 19525;  // mock host port
    protected LoggingPort = 19526;      // mock logging port

    protected loggingService: LoggingServiceImpl;
    protected hostStorageService: HostStorageServiceImpl;

    protected loggingServer: http.Server | undefined = undefined;
    protected hostStorageServer: http.Server | undefined = undefined;


    public onGetAccount: ((path: string) => DBAccount | undefined) | undefined = undefined;
    public onAddAccount: ((path: string, account: DBAccount) => void) | undefined = undefined;


    public constructor(
        options:
            { paused: boolean } |
            { unauthorized: boolean } |
            { deviceOfflined: boolean } |
            { paused: boolean, unauthorized: boolean } |
            { paused: boolean, deviceOfflined: boolean } |
            { unauthorized: boolean, deviceOfflined: boolean } |
            { paused: boolean, unauthorized: boolean, deviceOfflined: boolean } |
            undefined = undefined) {

        let paused = false;
        let unauthorized = false;
        let deviceOfflined = false;
        if (options !== undefined) {
            if (options as { paused: boolean }) {
                paused = (<{ paused: boolean }>options).paused;
            }
            if (options as { unauthorized: boolean }) {
                unauthorized = (<{ unauthorized: boolean }>options).unauthorized;
            }
            if (options as { deviceOfflined: boolean }) {
                deviceOfflined = (<{ deviceOfflined: boolean }>options).deviceOfflined;
            }
        }

        this.loggingService = new LoggingServiceImpl();
        this.hostStorageService = new HostStorageServiceImpl(paused, unauthorized, deviceOfflined);

        this.hostStorageService.onGetAccount = (path => {
            if (this.onGetAccount === undefined) return undefined;
            return this.onGetAccount(path);
        });

        this.hostStorageService.onAddAccount = ((path, account) => {
            if (this.onAddAccount === undefined) return;
            return this.onAddAccount(path, account);
        });
    }

    public async start(): Promise<void> {

        if (this.loggingServer !== undefined) return;

        let logging = express();
        logging.use(
            '/thrift',
            bodyParser.raw({type: 'application/vnd.apache.thrift.json'}),
            ThriftServerExpress<kr.LoggingService.Processor>({
                protocol: "json",
                handler: new kr.LoggingService.Processor(this.loggingService),
                serviceName: kr.LoggingService.serviceName
            })
        );
        this.loggingServer = logging.listen(this.LoggingPort, () => {
            console.log(`Express server listening [logging]`)
        });

        let hostStorage = express();
        hostStorage.use(
            '/thrift',
            bodyParser.raw({type: 'application/vnd.apache.thrift.json'}),
            ThriftServerExpress<kr.HostStorageService.Processor>({
                protocol: "json",
                handler: new kr.HostStorageService.Processor(this.hostStorageService),
                serviceName: kr.HostStorageService.serviceName
            })
        );

        this.hostStorageServer = hostStorage.listen(this.HostStoragePort, () => {
            console.log(`Express server listening [host storage]`)
        });
    }

    public async stop(): Promise<void> {
        if (this.loggingServer !== undefined) {
            await this.loggingServer.close();
        }
        if (this.hostStorageServer !== undefined) {
            await this.hostStorageServer.close();
        }
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }

    public setExtLogFilePath(filePath: string | undefined) {
        this.loggingService.setExtLogFilePath = filePath;
    };
}