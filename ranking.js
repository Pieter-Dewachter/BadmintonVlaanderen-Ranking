let profileElements = document.getElementsByClassName("profile")
let profileUrl = profileElements[profileElements.length - 1]
let playerUuid = profileUrl.href.split('=').pop()

chrome.runtime.sendMessage(
    {
        contentScriptQuery: "queryToernooi",
        playerUuid: playerUuid
    },
    data => {
        let parser = new DOMParser()
        let toernooiHtml = parser.parseFromString(data, "text/html")

        let toernooiDivs = toernooiHtml.getElementsByClassName("rating-header")
        let badmintonVlaanderenTrs = profileUrl.closest("table").rows

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
        badmintonVlaanderenTrs[1].getElementsByTagName("th")[4].textContent = "Stijgpunten"

        // New column: Daalpunten
        let th = document.createElement("th")
        th.className = "extraheader right"
        th.textContent = "Daalpunten"
        badmintonVlaanderenTrs[1].appendChild(th)

        // Fill in the "Daalpunten" values
        for (i = 0; i < toernooiDivs.length; ++i) {
            if (badmintonVlaanderenTrs[i+2]) {
                let discipline = badmintonVlaanderenTrs[i+2].getElementsByTagName("td")[0].textContent
                let td = document.createElement("td")
                td.className = "right"

                let index = disciplineMapping[discipline]
                let pointsDiv = toernooiDivs[index].getElementsByClassName("stats__value")[1]
                td.textContent = pointsDiv.textContent.split("-").pop().trim()
                badmintonVlaanderenTrs[i+2].appendChild(td)
            }
        }

        // Target points for ascending / descending in rank
        let ascendArray = [ 1373, 951, 659, 457, 316, 219, 152, 105, 73, 51, 35 ]
        let descendArray = [ 991, 686, 476, 330, 228, 158, 110, 76, 53, 36, 25 ]

        for (i = 0; i < toernooiDivs.length; ++i) {
            if (badmintonVlaanderenTrs[i+2]) {
                let discipline = badmintonVlaanderenTrs[i+2].getElementsByTagName("td")[0].textContent
                let index = disciplineMapping[discipline]

                let rank = parseInt(toernooiDivs[index].getElementsByClassName("tag-duo__title")[0].textContent)

                let ascend = badmintonVlaanderenTrs[i+2].getElementsByTagName("td")[5]
                ascend.setAttribute("data-value", rank > 1 ? ascendArray[rank - 2] : "-")
                ascend.classList.add("ascend")

                let descend = badmintonVlaanderenTrs[i+2].getElementsByTagName("td")[6]
                descend.setAttribute("data-value", rank < 12 ? descendArray[rank - 1] : "-")
                descend.classList.add("descend")
            }
        }
    }
);