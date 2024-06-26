const cdres = {
    qlist: { qdisc: [], qcode: [], qdesc: [] },
    score: [],
    alist: { arand: [], anset: [], ansrt: [], ansel: [] }
};

const optnum = 4;
const qdisc = ['GEN','MECH','CHEM','INST','ELEC'];
const qperdisc = [5,5,5,5,5];

async function downDB(file,edFlag)
{ 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([file],{type:'application/octet-binary'}));
    a.download = 'AV01_TPDB.db' + (edFlag?'e':'');
    document.body.appendChild(a);
    a.click();
}

async function initDB(passPhrase,edFlag) {
    try {
        const url = "./data/AV01_TPDB.db" + (edFlag?'':'e');
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        const passKey = await newAESKey(passPhrase);

        if (edFlag) {
            const encData = await cryptDB(data,passKey,true);
            downDB(encData,edFlag);
        } else {
            const decData = await cryptDB(data,passKey,false);
            const SQL = await initSqlJs();
            const results = new Array();
            qdisc.forEach((qd,qdx) => {
                results.push(executeQuery(new SQL.Database(new Uint8Array(decData)),`SELECT QCODE,QDISC,QDESC,ANSET,ANSRT FROM QBANK WHERE QDISC IN ('${qd}') ORDER BY RANDOM() LIMIT ${qperdisc[qdx]}`));
            });
        }
    } catch (err) {
        console.log(err);
    }
}

async function newAESKey(passPhrase) {
    const encoder = new TextEncoder();
    const passKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passPhrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    const aesKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(16),
            iterations: 1,
            hash: 'SHA-256',
        },
        passKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    return aesKey;
}

async function cryptDB(data,key,edFlag) {
    if (edFlag)
        return window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(12),
            },
            key,
            data
        );
    else
        return window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: new Uint8Array(12),
            },
            key,
            data
        );
}

async function executeQuery(db,query) {
    try {
        const result = db.exec(query);
        return populateTP(result);
    } catch (err) {
        console.error(err);
        alert('Error executing query: ' + err.message);
    }
}

async function hideShow(eID1,eID2) {
    document.querySelector(`div[class=${eID1}]`).style.display = 'none';
    document.querySelector(`div[class=${eID2}]`).style.display = 'block';
}

function populateTP(results) {
    results.forEach(result => {
        result.columns.forEach((col,cdx) => {
            result.values.forEach((row,rdx) => {
                switch (col) {
                    case 'QCODE':
                        cdres.qlist.qcode.push(row[cdx]);
                        cdres.qlist.qdisc.push(row[cdx]);
                        break;
                    case 'QDESC':
                        cdres.qlist.qdesc.push(row[cdx]);
                        break;
                    case 'ANSET':
                        popTP_ANSET(row,cdx,rdx);
                        break;
                    case 'ANSRT':
                        popTP_ANSRT(row,cdx,rdx);
                        break;
                }
            });
        });
    });
}

function popTP_ANSET(row,cdx,rdx) {
    cdres.alist.anset.push(row[cdx].split(/\r?\n/));
    cdres.alist.arand.push(Array.from({length:optnum},() => Math.floor(Math.random() * 1000)));
    cdres.alist.ansel.push(Array.from({length:optnum},() => 0));
}

function popTP_ANSRT(row,cdx,rdx) {
    let opt = row[cdx].split(',').map(Number);
    cdres.alist.ansrt.push(opt);
    popTP_Trim(rdx);
}

function popTP_Trim(rdx) {
    let anset_orig = cdres.alist.anset[rdx];
    while (cdres.alist.anset[rdx].length > optnum) {
        let sdel = Math.floor(Math.random() * anset_orig.length);
        let rdel = cdres.alist.ansrt[rdx].indexOf(sdel+1);
        if (sdel < cdres.alist.anset[rdx].length) cdres.alist.anset[rdx].splice(sdel,1);
        if (rdel > -1) {
            cdres.alist.ansrt[rdx].splice(rdel,1);
            while (rdel < cdres.alist.ansrt[rdx].length)
            {
                cdres.alist.ansrt[rdx][rdel++] -= 1;
            }
        }
    }
}

function createTable(qnum) {
    let html = `<div class="qname_${qnum}"><b>${cdres.qlist.qdesc[qnum]}</b></div>`;
    html += `<div class="checkbox-container">`;
    for(var i = 1; i <= optnum; i++)
    {
        let check = "";
        if (cdres.alist.ansel[qnum].indexOf(i) > -1)
            check = "checked";
        const random = cdres.alist.arand[qnum][i-1];
        html += `
            <div class="option" style="order:${random};">
                <div class="opt_checkbox">
                    <input 
                        type="checkbox" 
                        style="order:${random};" 
                        class="ansel_${qnum}" 
                        id="${i}" 
                        onchange="
                            hideShow('CDTP-Init','CDTP-Debug');
                            updateSelectedOptions('${qnum}')" 
                        ${check}>
                </div>
                <div class="opt_label">
                    <label 
                        style="order:${random};" 
                        for="${i}">${cdres.alist.anset[qnum][i-1]}
                    </label>
                </div>
            </div>`;
    }
    html += `</div>`;
    document.getElementById('output').innerHTML = html;
}

// Function to update the selected options string
function updateSelectedOptions(qnum) {
    const checkboxes = document.querySelectorAll(`input[class="ansel_${qnum}"]:checked`);
    const debugLog = document.querySelector(`div[data-active="true"]`);
    if (checkboxes.length > 0)
        document.getElementById(`${qnum}_prog`).dataset.attempt = "true";
    else
        document.getElementById(`${qnum}_prog`).dataset.attempt = "false";
    cdres.alist.ansel[qnum] = Array.from(checkboxes).map(cb => parseInt(cb.id));
    cdres.score[qnum] = scoreCalc(qnum);
    debugLog.innerHTML = `
        <i>
            <b>Question code:</b> ${cdres.qlist.qcode[qnum]}<br>
            <b>Score:</b> ${Math.floor(scoreCalc(qnum)*100)/100}
        </i>`;
}

function scoreCalc(qnum) {
    const s = cdres.alist.ansrt[qnum].filter(value => cdres.alist.ansel[qnum].includes(value)).length;
    const c = cdres.alist.ansrt[qnum].length;
    const sl = cdres.alist.ansel[qnum].length;
    return ((c>0)?(s/c):0) - ((optnum>c)?(sl-s)/(optnum-c):0);
}

function renameCat(str) {
    const replacements = new Map([
        ['GEN','General'],
        ['APT','Aptitude'],
        ['MECH','Mechanical'],
        ['CHEM','Chemical'],
        ['INST','Instrumentation'],
        ['ELEC','Electrical']
    ]);
    for (const [word, replacement] of replacements.entries()) {
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        str = str.replace(regex, replacement);
    }
    return str;
}

function progTrack() {
    var secTot = 0;
    const progDiv = document.getElementById("prog");
    qdisc.forEach((qd,qdx) => { 
        progDiv.innerHTML += `<div><b>${renameCat(qd)}<b></div>`;
        for(var i = secTot; i < (secTot + qperdisc[qdx]); i++) {
            progDiv.innerHTML += `
            <div 
                id="${i}_prog"
                data-attempt="false" 
                onclick="qNumField(${i})">
            </div>`;
        }
        secTot+= qperdisc[qdx];
    });
}

function qNumField(qnum) {
    const qbtnText = document.getElementById('qbtn');
    const qnumText = document.getElementById('qnum');
    const cdtpDbg = document.querySelector(`div[class="debug"]`);
    const debugLog = document.querySelector(`div[data-active="true"]`);
    var secTot = 0;
    qperdisc.forEach(qpd => secTot += qpd);
    if (qbtnText.innerHTML == 'Go to question') qnum--;
    qnumText.value = qnum;
    debugLog.dataset.active = "false";
    cdtpDbg.innerHTML = `<div data-active="true"></div>` + cdtpDbg.innerHTML;
    if (Number.isInteger(qnum)) {
        if (qnum < secTot && qnum >= 0) {
            createTable(qnum);
            qnumText.value = qnum+1;
            qbtnText.innerHTML = "Next question";
        }
        if (qnum == secTot-1) {
            qbtnText.innerHTML = "Finish test";
        }
    }
}