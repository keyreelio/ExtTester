import {IDatabase} from "./database";

import express, {Express} from 'express';
import * as bodyParser from 'body-parser'
import * as kr from "./gencode/AuxoftKeyReel";

import { ThriftServerExpress } from '@creditkarma/thrift-server-express'
import {LoggingServiceImpl, HostStorageServiceImpl} from "./thriftServices";


export class ThriftServer {

    protected HostStoragePort = 19525;  // mock host port
    protected LoggingPort = 19526;      // mock logging port


    protected database: IDatabase;

    protected loggingService: LoggingServiceImpl;
    protected hostStorageService: HostStorageServiceImpl;

    protected loggingServer: Express | undefined = undefined;
    protected hostStorageServer: Express | undefined = undefined;


    public constructor(
        database: IDatabase,
        options:
            { paused: boolean } |
            { unauthorized: boolean } |
            { deviceOfflined: boolean } |
            { paused: boolean, unauthorized: boolean } |
            { paused: boolean, deviceOfflined: boolean } |
            { unauthorized: boolean, deviceOfflined: boolean } |
            { paused: boolean, unauthorized: boolean, deviceOfflined: boolean }
            | undefined = undefined) {

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

        this.database = database;

        this.loggingService = new LoggingServiceImpl();
        this.hostStorageService = new HostStorageServiceImpl(this.database, paused, unauthorized, deviceOfflined);
    }

    public async start(): Promise<void> {

        if (this.loggingServer !== undefined) return;

        this.loggingServer = express();
        this.loggingServer.use(
            '/thrift',
            bodyParser.raw({type: 'application/vnd.apache.thrift.json'}),
            ThriftServerExpress<kr.LoggingService.Processor>({
                protocol: "json",
                handler: new kr.LoggingService.Processor(this.loggingService),
                serviceName: kr.LoggingService.serviceName
            })
        );
        this.loggingServer.listen(this.LoggingPort, () => {
            console.log(`Express server listening [logging]`)
        });

        this.hostStorageServer = express();
        this.hostStorageServer.use(
            '/thrift',
            bodyParser.raw({type: 'application/vnd.apache.thrift.json'}),
            ThriftServerExpress<kr.HostStorageService.Processor>({
                protocol: "json",
                handler: new kr.HostStorageService.Processor(this.hostStorageService),
                serviceName: kr.HostStorageService.serviceName
            })
        );

        this.hostStorageServer.listen(this.HostStoragePort, () => {
            console.log(`Express server listening [host storage]`)
        });
    }

    public async stop(): Promise<void> {
    }

    public async restart(): Promise<void> {
        await this.stop();
        await this.start();
    }
}