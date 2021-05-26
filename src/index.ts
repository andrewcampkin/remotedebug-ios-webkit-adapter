#!/usr/bin/env node

import { ProxyServer } from "./server";
import * as optimist from "optimist";
import * as info from "../package.json";

process.title = "remotedebug-ios-webkit-adapter";

let argv = optimist
    .usage("Usage: $0 -p [num] -h [str]")
    .alias("p", "port")
    .alias("h", "host")
    .describe("p", "the adapter listerning post")
    .default("p", 9000)
    .describe("h", "the adapter listerning host")
    .default("h", "127.0.0.1")
    .describe("version", "prints current version")
    .boolean("boolean").argv;

if (argv.version) {
    console.error(info.version);
    process.exit(0);
}

if (argv.help) {
    console.log(optimist.help());
    process.exit(0);
}

const server = new ProxyServer();

server
    .run(argv.port, argv.host)
    .then(({ port, host }) => {
        console.log(
            `remotedebug-ios-webkit-adapter is listening on port ${port} with host ${host}`
        );
    })
    .catch((err) => {
        console.error(
            "remotedebug-ios-webkit-adapter failed to run with the following error:",
            err
        );
        process.exit();
    });

process.on("SIGINT", function () {
    server.stop();
    process.exit();
});

process.on("SIGTERM", function () {
    server.stop();
    process.exit();
});
