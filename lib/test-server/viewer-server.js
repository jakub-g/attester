/*
 * Copyright 2014 Amadeus s.a.s.
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

var Viewer = function (socket, data, testServer) {
    this.socket = socket;
    // TODO: when attester supports multiple campaigns, add campaign selection:
    this.campaign = testServer.campaigns[0];
    if (!this.campaign || !this.campaign.results) {
        socket.disconnect();
        return;
    }
    this.connected = true;

    this.onCampaignResult = this.onCampaignResult.bind(this);
    this.onSocketDisconnected = this.onSocketDisconnected.bind(this);
    this.sendFirstResults = this.sendFirstResults.bind(this);

    this.socket.on("disconnect", this.onSocketDisconnected);

    this.resultsSent = 0;
    this.allStoredResultsSent = false;

    this.sendFirstResults();
    this.socket.on("firstResults", this.sendFirstResults);
};

Viewer.prototype.sendFirstResults = function () {
    if (this.allStoredResultsSent) {
        return;
    }
    var results = this.campaign.results;
    var i = this.resultsSent;
    for (var l = Math.min(i + 50, results.length); i < l; i++) {
        this.onCampaignResult(results[i]);
    }
    this.socket.emit("firstResults", {
        transmitted: i,
        total: results.length
    });
    if (i == results.length) {
        this.allStoredResultsSent = true;
        this.campaign.on("result", this.onCampaignResult);
    }
};

Viewer.prototype.onCampaignResult = function (result) {
    this.resultsSent++;
    this.socket.emit("result", result);
};

Viewer.prototype.onSocketDisconnected = function () {
    this.connected = false;
    if (this.allStoredResultsSent) {
        this.campaign.removeListener("result", this.onCampaignResult);
    }
};

module.exports = Viewer;