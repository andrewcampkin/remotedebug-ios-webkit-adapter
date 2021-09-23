"use strict";
//
// Copyright (C) Microsoft. All rights reserved.
//
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyServer = void 0;
const http = require("http");
const express = require("express");
const ws_1 = require("ws");
const events_1 = require("events");
const iosAdapter_1 = require("./adapters/iosAdapter");
const debug = require("debug");
// import { TestAdapter } from './adapters/testAdapter';
class ProxyServer extends events_1.EventEmitter {
    constructor() {
        super();
    }
    run(serverPort, serverHost, frontendUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            this._serverPort = serverPort;
            const host = serverHost !== null && serverHost !== void 0 ? serverHost : "localhost";
            this._serverHost = host;
            debug("server.run")(serverPort, this._serverHost, frontendUrl);
            this._es = express();
            this._hs = http.createServer(this._es);
            this._wss = new ws_1.Server({
                server: this._hs,
            });
            this._wss.on("connection", (a, req) => this.onWSSConnection(a, req));
            this.setupHttpHandlers();
            // Start server and return the port number
            this._hs.listen(this._serverPort);
            const port = this._hs.address().port;
            const settings = yield iosAdapter_1.IOSAdapter.getProxySettings({
                proxyPort: port + 100,
                proxyHost: host,
            });
            this._adapter = new iosAdapter_1.IOSAdapter(`/ios`, `ws://${host}:${port}`, settings, frontendUrl);
            return this._adapter
                .start()
                .then(() => {
                this.startTargetFetcher();
            })
                .then(() => {
                return { port, host, frontendUrl };
            });
        });
    }
    stop() {
        var _a;
        debug("server.stop");
        if (this._hs) {
            this._hs.close();
            this._hs = null;
        }
        this.stopTargetFetcher();
        (_a = this._adapter) === null || _a === void 0 ? void 0 : _a.stop();
    }
    getAdapter() {
        return this._adapter;
    }
    startTargetFetcher() {
        debug("server.startTargetFetcher");
        let fetch = () => {
            var _a;
            (_a = this._adapter) === null || _a === void 0 ? void 0 : _a.getTargets().then((targets) => {
                debug(`server.startTargetFetcher.fetched`)(targets.length);
            }, (err) => {
                debug(`server.startTargetFetcher.error`)(err);
            });
        };
        this._targetFetcherInterval = setInterval(fetch, 5000);
    }
    stopTargetFetcher() {
        debug("server.stopTargetFetcher");
        if (!this._targetFetcherInterval) {
            return;
        }
        clearInterval(this._targetFetcherInterval);
    }
    setupHttpHandlers() {
        var _a, _b, _c, _d, _e, _f;
        debug("server.setupHttpHandlers");
        (_a = this._es) === null || _a === void 0 ? void 0 : _a.get("/", (req, res) => {
            debug("server.http.endpoint/");
            res.json({
                msg: "Hello from RemoteDebug iOS WebKit Adapter",
            });
        });
        (_b = this._es) === null || _b === void 0 ? void 0 : _b.get("/refresh", (req, res) => {
            var _a;
            (_a = this._adapter) === null || _a === void 0 ? void 0 : _a.forceRefresh();
            this.emit("forceRefresh");
            res.json({
                status: "ok",
            });
        });
        (_c = this._es) === null || _c === void 0 ? void 0 : _c.get("/json", (req, res) => {
            var _a;
            debug("server.http.endpoint/json");
            (_a = this._adapter) === null || _a === void 0 ? void 0 : _a.getTargets().then((targets) => {
                res.json(targets);
            });
        });
        (_d = this._es) === null || _d === void 0 ? void 0 : _d.get("/json/list", (req, res) => {
            var _a;
            debug("server.http.endpoint/json/list");
            (_a = this._adapter) === null || _a === void 0 ? void 0 : _a.getTargets().then((targets) => {
                res.json(targets);
            });
        });
        (_e = this._es) === null || _e === void 0 ? void 0 : _e.get("/json/version", (req, res) => {
            debug("server.http.endpoint/json/version");
            res.json({
                Browser: "Safari/RemoteDebug iOS Webkit Adapter",
                "Protocol-Version": "1.2",
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/57.0.2926.0 Safari/537.36",
                "WebKit-Version": "537.36 (@da59d418f54604ba2451cd0ef3a9cd42c05ca530)",
            });
        });
        (_f = this._es) === null || _f === void 0 ? void 0 : _f.get("/json/protocol", (req, res) => {
            debug("server.http.endpoint/json/protocol");
            res.json();
        });
    }
    onWSSConnection(websocket, req) {
        var _a;
        const url = req.url;
        debug("server.ws.onWSSConnection")(url);
        let connection = websocket;
        try {
            url && ((_a = this._adapter) === null || _a === void 0 ? void 0 : _a.connectTo(url, websocket));
        }
        catch (err) {
            debug(`server.onWSSConnection`)(err);
        }
        connection.on("message", (msg) => {
            var _a;
            url && ((_a = this._adapter) === null || _a === void 0 ? void 0 : _a.forwardTo(url, msg));
        });
    }
}
exports.ProxyServer = ProxyServer;
