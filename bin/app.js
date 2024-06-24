const cdres = {
    qlist: { qdisc: [], qcode: [], qdesc: [] },
    score: [],
    alist: { arand: [], anset: [], ansrt: [], ansel: [] }
};

const optnum = 4;
const cdisc = "CHEM";
const queries = [
    `SELECT QCODE,QDISC,QDESC,ANSET,ANSRT FROM QBANK WHERE QDISC IN ('GEN') ORDER BY RANDOM() LIMIT 10`,
    `SELECT QCODE,QDISC,QDESC,ANSET,ANSRT FROM QBANK WHERE QDISC IN ('${cdisc}') ORDER BY RANDOM() LIMIT 10`
];

async function downDB(file,flag)
{ 
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([file],{type:'application/octet-binary'}));
    a.download = 'AV01_TPDB.db' + (flag?'e':'');
    document.body.appendChild(a);
    a.click();
}

async function initDB(pass,flag) {
    try {
        const url = "./data/AV01_TPDB.db" + (flag?'':'e');
        const res = await fetch(url);
        const data = await res.arrayBuffer();
        const passKey = await newAESKey(pass);

        if (flag) {
            const encData = await cryptDB(data,passKey,true);
            downDB(encData,flag);
        } else {
            const decData = await cryptDB(data,passKey,false);
            const SQL = await initSqlJs();
            const results = new Array();
            queries.forEach(query => {
                results.push(executeQuery(new SQL.Database(new Uint8Array(decData)),query));
            });
            db.close();
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

async function cryptDB(data,key,flag) {
    if (flag)
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
        result.columns.forEach((col, cdx) => {
            result.values.forEach((row, rdx) => {
                switch (col) {
                    case 'QCODE':
                        cdres.qlist.qcode.push(row[cdx]);
                        cdres.score.push(0);
                        break;
                    case 'QDISC':
                        cdres.qlist.qdisc.push(row[cdx]);
                        break;
                    case 'QDESC':
                        cdres.qlist.qdesc.push(row[cdx]);
                        break;
                    case 'ANSET':
                        popTP_ANSET(row, cdx, rdx);
                        break;
                    case 'ANSRT':
                        popTP_ANSRT(row, cdx, rdx);
                        break;
                }
            });
        });
    });
}

function popTP_ANSET(row, cdx, rdx) {
    cdres.alist.anset.push(row[cdx].slice(1,-1).replace(/","/g,'---').split('---'));
    cdres.alist.arand.push(Array.from({length:optnum},() => Math.floor(Math.random() * 1000)));
    cdres.alist.ansel.push(Array.from({length:optnum},() => 0));
}

function popTP_ANSRT(row, cdx, rdx) {
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
        html += `
            <div class="option" style="order:${cdres.alist.arand[qnum][i-1]};">
                <div class="opt_checkbox">
                    <input 
                        type="checkbox" 
                        style="order:${cdres.alist.arand[qnum][i-1]};" 
                        class="ansel_${qnum}" 
                        id="${i}" 
                        onchange="
                            hideShow('CDTP-Init','CDTP-Debug');
                            updateSelectedOptions('${qnum}')" 
                        ${check}>
                </div>
                <div class="opt_label">
                    <label 
                        style="order:${cdres.alist.arand[qnum][i-1]};" 
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
    cdres.alist.ansel[qnum] = Array.from(checkboxes).map(cb => parseInt(cb.id));
    cdres.score[qnum] = scoreCalc(qnum);
    debugLog.innerHTML = `
        <i>
            <b>Question code:</b> ${cdres.qlist.qcode[qnum]}<br>
            <b>Score:</b> ${scoreCalc(qnum)}
        </i>`;
}

function scoreCalc(qnum) {
    const s = cdres.alist.ansrt[qnum].filter(value => cdres.alist.ansel[qnum].includes(value)).length;
    const c = cdres.alist.ansrt[qnum].length;
    const sl = cdres.alist.ansel[qnum].length;
    return ((c>0)?(s/c):0) - ((optnum>c)?(sl-s)/(optnum-c):0);
}

function qNumField(qnum) {
    const qbtnText = document.getElementById('qbtn');
    const qnumText = document.getElementById('qnum');
    const cdtpDbg = document.querySelector(`div[class="debug"]`);
    const debugLog = document.querySelector(`div[data-active="true"]`);
    debugLog.dataset.active = "false";
    cdtpDbg.innerHTML = `<div data-active="true"></div>` + cdtpDbg.innerHTML;
    if (Number.isInteger(qnum)) {
        if (qnum < 20 && qnum > 0) {
            switch(qbtnText.innerHTML) {
                case 'Next question':
                    createTable(qnum);
                    qnumText.value = qnum+1;
                    if (qnum == 19)
                        qbtnText.innerHTML = "Go to start";
                    else
                        qbtnText.innerHTML = "Next question";
                    break;
                case 'Go to question':
                    createTable(qnum-1);
                    qbtnText.innerHTML = "Next question";
                    break;
            }
        }
        if (qnum == 20 && qbtnText.innerHTML == 'Go to start') {
            createTable(0);
            qnumText.value = 1;
            qbtnText.innerHTML = "Next question";
        } 
    } 
}