chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    if (request.contentScriptQuery == "queryToernooi") {
        let toernooiUrl = "https://www.toernooi.nl/player-profile/" + request.playerUuid + "/Rating"
        fetch(toernooiUrl)
            .then(response => response.text())
            .then(data => sendResponse(data))
        return true
      }
} )