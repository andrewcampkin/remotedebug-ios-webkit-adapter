#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const optimist = require("optimist");
const info = require("../package.json");
process.title = "remotedebug-ios-webkit-adapter";
let argv = optimist
    .usage("Usage: $0 -p [num] -h [str] -f [str]")
    .alias("p", "port")
    .alias("h", "host")
    .alias("f", "frontendUrl")
    .describe("p", "the adapter listening post")
    .default("p", 9000)
    .describe("f", "the adapter devtools-frontend Url")
    .describe("h", "the adapter listening host")
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
const server = new server_1.ProxyServer();
server
    .run(argv.port, argv.host, argv.frontendUrl)
    .then(({ port, host, frontendUrl }) => {
    console.log(`remotedebug-ios-webkit-adapter is listening on port ${port} with host ${host} and devtools frontend url: ${frontendUrl}`);
})
    .catch((err) => {
    console.error("remotedebug-ios-webkit-adapter failed to run with the following error:", err);
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
