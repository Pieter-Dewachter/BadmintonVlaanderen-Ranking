chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.contentScriptQuery == "queryToernooi") {
        // The BV ranking page gives us a "site-local" player GUID + numeric id,
        // but the /player-profile/<guid>/Rating page uses a DIFFERENT GUID
        // (the one toernooi.nl assigns). Hitting /player/<bvGuid>/<bvId>
        // server-redirects to /player-profile/<toernooiGuid>, so we follow
        // the redirect and read the final URL to discover the right GUID.
        let resolveUrl = "https://badvla.tournamentsoftware.com/player/"
            + request.playerUuid + "/" + request.playerId
        console.log("BV Ranking [bg]: resolve", resolveUrl)
        fetch(resolveUrl, { redirect: "follow" })
            .then(response => {
                console.log("BV Ranking [bg]: resolved to", response.url, "status", response.status)
                let m = response.url.match(/\/player-profile\/([0-9a-f-]+)/i)
                if (!m) {
                    throw new Error("could not resolve toernooi GUID from " + response.url)
                }
                let toernooiGuid = m[1]
                let ratingUrl = "https://badvla.tournamentsoftware.com/player-profile/"
                    + toernooiGuid + "/Rating"
                console.log("BV Ranking [bg]: fetch rating", ratingUrl)
                return fetch(ratingUrl)
            })
            .then(response => {
                console.log("BV Ranking [bg]: rating response status", response.status)
                return response.text()
            })
            .then(data => sendResponse(data))
            .catch(err => {
                console.error("BV Ranking: queryToernooi failed", err)
                sendResponse(null)
            })
        return true
    }
    else if (request.contentScriptQuery == "queryRobSphere") {
        let robSphereUrl = "https://badmintonvlaanderen.robsphere.eu/api/public/players/" + request.playerId + "/counters"
        fetch (robSphereUrl)
            .then(response => response.json())
            .then(data => sendResponse(data))
            .catch(_ => sendResponse({ "singleCounterSum": 0, "doubleCounterSum": 0, "mixedCounterSum": 0 }))
        return true
    }
} )