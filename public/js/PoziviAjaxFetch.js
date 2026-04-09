const PoziviAjaxFetch = (function() {

    function postScenario(title, userId, callback) {
        const podaci = { title: title,
            userId: userId
        };
        fetch('/api/scenarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(podaci)
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }
    //vraca greske u formi jsona
    function lockLine(scenarioId, lineId, userId, callback) {
        const url = `/api/scenarios/${scenarioId}/lines/${lineId}/lock`;
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }
    //vraca greske u formi jsona
    function updateLine(scenarioId, lineId, userId, newText, callback) {
        const url = `/api/scenarios/${scenarioId}/lines/${lineId}`;
        fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                newText: Array.isArray(newText) ? newText : [newText] // Osiguravamo da je niz
            })
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }

    function lockCharacter(scenarioId, characterName, userId, callback) {
        const url = `/api/scenarios/${scenarioId}/characters/lock`;
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                characterName: characterName
            })
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }

    function updateCharacter(scenarioId, userId, oldName, newName, callback) {
        const url = `/api/scenarios/${scenarioId}/characters/update`;
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                oldName: oldName,
                newName: newName
            })
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }

    function getDeltas(scenarioId, since, callback) {
        const url = `/api/scenarios/${scenarioId}/deltas?since=${since}`;
        fetch(url, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }

    function getScenario(scenarioId, callback) {
        fetch(`/api/scenarios/${scenarioId}`)
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }

    function handleResponse(response, callback) {
        response.json()
            .then(data => {
                // Pozivamo callback sa statusom i podacima 
                callback(response.status, data);
            })
            .catch(err => {
                // Ako server ne vrati JSON ili pukne parsiranje
                callback(response.status, { message: "Greška pri parsiranju odgovora" });
            });
    }
    function registrujKorisnika(data, callback){
        fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName: data.ime, 
                email: data.email,
                password: data.password,
                notifFrequency: data.frequency
            })
        })
        .then(response => handleResponse(response, callback))
        .catch(error => callback(500, { message: "Greška na mreži: " + error }));
    }

    return {
        postScenario: postScenario,
        lockLine: lockLine,
        updateLine: updateLine,
        lockCharacter: lockCharacter,
        updateCharacter: updateCharacter,
        getDeltas: getDeltas,
        getScenario: getScenario,
        registrujKorisnika: registrujKorisnika
    };
})();