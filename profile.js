let playerUuid = window.location.href.split('=').pop()
let badmintonVlaanderenTrs = document.getElementsByClassName("currentranking")[0].getElementsByTagName("table")[0].rows

let queryToernooi = () => {
    chrome.runtime.sendMessage(
        {
            contentScriptQuery: "queryToernooi",
            playerUuid: playerUuid
        },
        data => {
            let parser = new DOMParser()
            let toernooiHtml = parser.parseFromString(data, "text/html")

            let toernooiDivs = toernooiHtml.getElementsByClassName("rating-header")

            // Not everyone has a rank for all disciplines => needs mapping based on name
            let disciplineMapping = {
                "HE/SM": 0,
                "DE/SD": 0,
                "HD/DM": 1,
                "DD": 1,
                "GD H/DX M": 2,
                "GD D/DX D": 2
            }
                
            // Totaal punten => Stijgpunten
            badmintonVlaanderenTrs[0].getElementsByTagName("td")[3].textContent = "Stijgpunten"

            // New column: Daalpunten
            let td = document.createElement("td")
            td.className = "extraheader right"
            td.textContent = "Daalpunten"
            badmintonVlaanderenTrs[0].appendChild(td)

            // Fill in the "Daalpunten" values
            for (i = 0; i < toernooiDivs.length; ++i) {
                if (badmintonVlaanderenTrs[i+1]) {
                    let discipline = badmintonVlaanderenTrs[i+1].getElementsByTagName("td")[0].textContent
                    let td = document.createElement("td")
                    td.className = "right"

                    let index = disciplineMapping[discipline]
                    let pointsDiv = toernooiDivs[index].getElementsByClassName("stats__value")[1]
                    td.textContent = pointsDiv.textContent.split("-").pop().trim()
                    badmintonVlaanderenTrs[i+1].appendChild(td)
                }
            }

            // Target points for ascending / descending in rank
            let ascendArray = [ 1373, 951, 659, 457, 316, 219, 152, 105, 73, 51, 35 ]
            let descendArray = [ 991, 686, 476, 330, 228, 158, 110, 76, 53, 36, 25 ]

            for (i = 0; i < toernooiDivs.length; ++i) {
                if (badmintonVlaanderenTrs[i+1]) {
                    let discipline = badmintonVlaanderenTrs[i+1].getElementsByTagName("td")[0].textContent
                    let index = disciplineMapping[discipline]

                    let rank = parseInt(toernooiDivs[index].getElementsByClassName("tag-duo__title")[0].textContent)

                    let ascend = badmintonVlaanderenTrs[i+1].getElementsByTagName("td")[3]
                    ascend.setAttribute("data-value", rank > 1 ? ascendArray[rank - 2] : "-")
                    ascend.classList.add("ascend")

                    let descend = badmintonVlaanderenTrs[i+1].getElementsByTagName("td")[4]
                    descend.setAttribute("data-value", rank < 12 ? descendArray[rank - 1] : "-")
                    descend.classList.add("descend")
                }
            }

            let playerId = toernooiHtml.getElementsByClassName("media__title-aside")[0].textContent
            queryRobSphere(playerId.slice(1, -1)) // Remove parenthesis
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
            // Extract points from JSON data
            let bonusPoints = {
                "HE/SM": data.singleCounterSum || 0,
                "DE/SD": data.singleCounterSum || 0,
                "HD/DM": data.doubleCounterSum || 0,
                "DD": data.doubleCounterSum || 0,
                "GD H/DX M": data.mixedCounterSum || 0,
                "GD D/DX D": data.mixedCounterSum || 0
            }

            // Target points for ascending in rank
            let bonusLimits = {
                "HE/SM": 12,
                "DE/SD": 8,
                "HD/DM": 24,
                "DD": 16,
                "GD H/DX M": 24,
                "GD D/DX D": 24
            }

            // New column: Bonuspunten
            let td = document.createElement("td")
            td.className = "extraheader right"
            td.textContent = "Bonuspunten"
            badmintonVlaanderenTrs[0].appendChild(td)

            // Fill in the "Bonuspunten" values
            for (i = 1; i < badmintonVlaanderenTrs.length; ++i) {
                let discipline = badmintonVlaanderenTrs[i].getElementsByTagName("td")[0].textContent
                let td = document.createElement("td")

                td.className = "right bonus"
                td.textContent = bonusPoints[discipline]
                td.setAttribute("data-value", bonusLimits[discipline])
                badmintonVlaanderenTrs[i].appendChild(td)
            }
        }
    )
}

queryToernooi()
