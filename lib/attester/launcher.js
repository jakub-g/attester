/*
 * Copyright 2013 Amadeus s.a.s.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * This module start some browsers if needed for a given campaign.
 * Browsers are not necessarily installed locally, for this reason this module
 * emit events that could be listened to by external plugins to drive remote machines
 *
 * Useful events are
 * attester.server.started raised when the server is listening
 * attester.server.attached raised when there's at least one campaign attached to the server
 * launcher.connect raised when there's at least one campaign ready to be executed by slaves
 *
 * The most interesting event for plugins is launcher.connect which provides as well the
 * slave URL. Other events might be used to perform initialization.
 */

var attester = require("../attester");

// Include also some default launchers
var phantomLauncher = require("../launchers/phantom-launcher");
var browserLauncher = require("../launchers/browser-launcher");
var robotBrowserLauncher = require("../launchers/robot-browser-launcher");

// so that (phantomjs-instances + the number of browsers) can be > 10:
process.stdout.setMaxListeners(256);
process.stderr.setMaxListeners(256);

// Do it here so that launchers using childProcesses don't have to care about it
var childProcesses = require("../util/child-processes.js");

/* I believe the order in which events are raised is fragile. server.attached is in the callback
 * of campaign.init, while campaign.tasksList is inside the init, just after the callback
 * In the future we might change this logic, so this module makes sure that launcher.connect
 * is always raised after server.attached and it always contains the slave URL
 */
var urlInfo = null;
var raiseOnAttached = false;

// Raise the connect event

function raiseConnect() {
    attester.event.emit("launcher.connect", urlInfo.slaveURL);
}

function onServerAttached(event) {
    urlInfo = event;
    if (raiseOnAttached) {
        process.nextTick(raiseConnect);
    }
}

function onTasksList(event) {
    if (!urlInfo) {
        // The server is not attached yet
        raiseOnAttached = true;
    } else {
        process.nextTick(raiseConnect);
    }
}

exports.__init__ = function () {
    attester.event.once("attester.server.attached", onServerAttached);
    attester.event.on("attester.campaign.tasksList", onTasksList);
    phantomLauncher.__init__();
    browserLauncher.__init__();
    robotBrowserLauncher.__init__();
};

exports.__reset__ = function () {
    urlInfo = null;
    raiseOnAttached = false;

    browserLauncher.__reset__();
    phantomLauncher.__reset__();
    robotBrowserLauncher.__reset__();
    attester.event.off("attester.server.attached", onServerAttached);
    attester.event.off("attester.campaign.tasksList", onTasksList);

    var initialProcesses = childProcesses.number();
    if (initialProcesses > 0) {
        attester.logger.logInfo("Waiting for the " + initialProcesses + " child process(es) to stop...");
    }
    // give some time (5s max) for the clients to disconnect so we don't have to kill them
    return childProcesses.wait(5000).then(function () {
        var remainingProcesses = childProcesses.number();
        if (initialProcesses > 0) {
            if (remainingProcesses === 0) {
                attester.logger.logInfo("All child processes are closed.");
            } else {
                attester.logger.logInfo("Timeout reached, now killing the remaining " + remainingProcesses + " child process(es).");
            }
        }
        childProcesses.closeAll();
        attester.logger.logDebug("__reset__ launcher done");
    });
};