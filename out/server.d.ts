/// <reference types="node" />
import { EventEmitter } from "events";
import { Adapter } from "./adapters/adapter";
export declare class ProxyServer extends EventEmitter {
    private _hs;
    private _es;
    private _wss;
    private _serverPort;
    private _serverHost;
    private _adapter;
    private _targetFetcherInterval;
    constructor();
    run(serverPort: number, serverHost?: string, frontendUrl?: string): Promise<{
        port: number;
        host: string;
        frontendUrl?: string;
    }>;
    stop(): void;
    getAdapter(): Adapter | undefined;
    private startTargetFetcher;
    private stopTargetFetcher;
    private setupHttpHandlers;
    private onWSSConnection;
}
