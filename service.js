chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.contentScriptQuery == "queryToernooi") {
        let cookieUrl = "https://www.toernooi.nl/cookiewall/Save"
        fetch(cookieUrl, { method: "POST" })
            .then(_ => {
                let toernooiUrl = "https://www.toernooi.nl/player-profile/" + request.playerUuid + "/Rating"
                fetch(toernooiUrl)
                    .then(response => response.text())
                    .then(data => sendResponse(data))
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