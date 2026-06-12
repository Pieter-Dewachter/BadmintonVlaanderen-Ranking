console.log("BV Ranking: content script loaded on", window.location.href)

// New layout (2026): the BV ranking table has class "ruler" and a caption
// containing an <a class="icon profile"> link to the player profile.
// Row layout:
//   rows[0] = empty <tr> inside <thead>
//   rows[1] = header row (<th> cells; "Rank" has colspan=2 => 5 cells)
//   rows[2+] = one row per discipline (6 <td> cells)
let profileElements = document.getElementsByClassName("profile")
let profileLink = profileElements[profileElements.length - 1]
if (!profileLink) {
    console.error("BV Ranking: no .profile element found on page; aborting")
}
let rankingTable = profileLink && profileLink.closest("table")
let badmintonVlaanderenTrs = rankingTable ? rankingTable.rows : []
// The BV profile link looks like /player/<GUID>/<NUMERIC_ID>. Both parts are
// needed to resolve to the toernooi-side player-profile URL.
let playerUuid = null
let playerId = null
if (profileLink) {
    let m = profileLink.getAttribute("href").match(/\/player\/([^/]+)\/([^/?#]+)/i)
    if (m) {
        playerUuid = m[1]
        playerId = m[2]
    }
}

console.log("BV Ranking: playerUuid =", playerUuid, "playerId =", playerId,
    "rows =", badmintonVlaanderenTrs.length)

let disciplineMapping = {
    "HE/SM": 0,
    "DE/SD": 0,
    "HD/DM": 1,
    "DD": 1,
    "GD H/DX M": 2,
    "GD D/DX D": 2
}

let getDiscipline = (tr) => tr.getElementsByTagName("td")[0].textContent.trim()

let queryToernooi = () => {
    if (!rankingTable) return

    chrome.runtime.sendMessage(
        {
            contentScriptQuery: "queryToernooi",
            playerUuid: playerUuid,
            playerId: playerId
        },
        data => {
            if (chrome.runtime.lastError) {
                console.error("BV Ranking: sendMessage(queryToernooi) error:", chrome.runtime.lastError)
                return
            }
            console.log("BV Ranking: toernooi.nl response,", data ? data.length : 0, "chars")
            if (!data) return

            let parser = new DOMParser()
            let toernooiHtml = parser.parseFromString(data, "text/html")
            let toernooiDivs = toernooiHtml.getElementsByClassName("rating-header")

            if (toernooiDivs.length === 0) {
                console.error("BV Ranking: no .rating-header divs in toernooi.nl response")
                return
            }

            let headerRow = badmintonVlaanderenTrs[1]

            // Totaal punten => Stijgpunten
            headerRow.getElementsByTagName("th")[4].textContent = "Stijgpunten"

            // New column: Daalpunten
            let th = document.createElement("th")
            th.className = "extraheader right"
            th.textContent = "Daalpunten"
            headerRow.appendChild(th)

            // Fill in the "Daalpunten" values
            for (let i = 0; i < toernooiDivs.length; ++i) {
                let row = badmintonVlaanderenTrs[i + 2]
                if (!row) continue

                let discipline = getDiscipline(row)
                let index = disciplineMapping[discipline]
                if (index === undefined) {
                    console.warn("BV Ranking: unknown discipline", JSON.stringify(discipline))
                    continue
                }

                let td = document.createElement("td")
                td.className = "right"
                let pointsDiv = toernooiDivs[index].getElementsByClassName("stats__value")[1]
                td.textContent = pointsDiv.textContent.split("-").pop().trim()
                row.appendChild(td)
            }

            // Target points for ascending / descending in rank
            let ascendArray = [ 1373, 951, 659, 457, 316, 219, 152, 105, 73, 51, 35 ]
            let descendArray = [ 991, 686, 476, 330, 228, 158, 110, 76, 53, 36, 25 ]

            for (let i = 0; i < toernooiDivs.length; ++i) {
                let row = badmintonVlaanderenTrs[i + 2]
                if (!row) continue

                let discipline = getDiscipline(row)
                let index = disciplineMapping[discipline]
                if (index === undefined) continue

                let rank = parseInt(toernooiDivs[index].getElementsByClassName("tag-duo__title")[0].textContent)
                let tds = row.getElementsByTagName("td")

                let ascend = tds[5]
                ascend.setAttribute("data-value", rank > 1 ? ascendArray[rank - 2] : "-")
                ascend.classList.add("ascend")

                let descend = tds[6]
                descend.setAttribute("data-value", rank < 12 ? descendArray[rank - 1] : "-")
                descend.classList.add("descend")
            }

            let playerIdEl = toernooiHtml.getElementsByClassName("media__title-aside")[0]
            if (!playerIdEl) {
                console.error("BV Ranking: missing .media__title-aside in toernooi.nl response")
                return
            }
            let playerId = playerIdEl.textContent.trim()
            queryRobSphere(playerId.slice(1, -1)) // Remove parentheses
        }
    )
}

let queryRobSphere = (playerId) => {
    chrome.runtime.sendMessage(
        {
            contentScriptQuery: "queryRobSphere",
            playerId: playerId
        },
        data => {
            if (chrome.runtime.lastError) {
                console.error("BV Ranking: sendMessage(queryRobSphere) error:", chrome.runtime.lastError)
                return
            }
            console.log("BV Ranking: robsphere response", data)
            if (!data) return

            let bonusPoints = {
                "HE/SM": data.singleCounterSum || 0,
                "DE/SD": data.singleCounterSum || 0,
                "HD/DM": data.doubleCounterSum || 0,
                "DD": data.doubleCounterSum || 0,
                "GD H/DX M": data.mixedCounterSum || 0,
                "GD D/DX D": data.mixedCounterSum || 0
            }

            let bonusLimits = {
                "HE/SM": 12,
                "DE/SD": 8,
                "HD/DM": 24,
                "DD": 16,
                "GD H/DX M": 24,
                "GD D/DX D": 24
            }

            // New column: Bonuspunten
            let th = document.createElement("th")
            th.className = "extraheader right"
            th.textContent = "Bonuspunten"
            badmintonVlaanderenTrs[1].appendChild(th)

            // Fill in the "Bonuspunten" values
            for (let i = 2; i < badmintonVlaanderenTrs.length; ++i) {
                let discipline = getDiscipline(badmintonVlaanderenTrs[i])
                let td = document.createElement("td")
                td.className = "right bonus"
                td.textContent = bonusPoints[discipline] ?? ""
                if (bonusLimits[discipline] !== undefined) {
                    td.setAttribute("data-value", bonusLimits[discipline])
                }
                badmintonVlaanderenTrs[i].appendChild(td)
            }
        }
    )
}

queryToernooi()
