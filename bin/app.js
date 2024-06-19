var cdres = {
    qlist: {
        qcode: new Array(),
        qdesc: new Array()
    },
    score: new Array(),
    alist: {
        arand: new Array(),
        anset: new Array(),
        ansrt: new Array(), 
        ansel: new Array()
    }
};

const optnum = 4;
const url = './data/AV01_TPDB.db'; // Replace with your database URL
const query = `SELECT QCODE,QDESC,ANSET,ANSRT FROM QBANK WHERE QDISC IN ('GEN') ORDER BY RANDOM() LIMIT 10`;

let db;
fetch(url).then(res => res.arrayBuffer()).then(data => {
    return initSqlJs().then(SQL => {
        db = new SQL.Database(new Uint8Array(data));
    });
}).catch(err => console.error(err));

console.log(db);

// Function to execute the query from the textbox
function executeQuery() {
    try {
        const results = db.exec(query);
        populateTP(results);
    } catch (err) {
        console.error(err);
        alert('Error executing query: ' + err.message);
    }
}

function populateTP(results) {
    var optnum = 4;
    results[0].columns.forEach((col,cdx) => {
        if (col === 'QCODE') {
            results[0].values.forEach((row,rdx) => {
                cdres.qlist.qcode.push(row[cdx]);
                cdres.score.push(0);
            });
        }
        if (col === 'QDESC') {
            results[0].values.forEach((row,rdx) => {
                cdres.qlist.qdesc.push(row[cdx]);
            });
        }
        if (col === 'ANSET') {
            results[0].values.forEach((row,rdx) => {
                cdres.alist.anset.push(row[cdx].replace(/",/g,'---').split('---'));
                cdres.alist.arand.push(Array.from({length:optnum},() => Math.floor(Math.random()*1000)));
                cdres.alist.ansel.push(Array.from({length:optnum},() => 0));

            });
        }
        if (col === 'ANSRT') {
            results[0].values.forEach((row,rdx) => {
                cdres.alist.ansrt.push(row[cdx].split(',').map(Number));
                while (cdres.alist.anset[rdx].length > optnum)
                {
                    let adel = Math.floor(Math.random()*cdres.alist.anset[rdx].length);
                    let rdel = cdres.alist.ansrt[rdx].indexOf(adel+1);
                    cdres.alist.anset[rdx].splice(adel,1);
                    if (rdel != -1)
                        cdres.alist.ansrt[rdx][rdel] = 0;
                }
            });
        }
    });
    return cdres;
}

function createTable(qnum) {
    let html = `<div class="qname_${qnum}"><b>${cdres.qlist.qdesc[qnum]}</b></div>`;
    html += `<div class="checkbox-container">`;
    for(var i = 1; i <= optnum; i++)
    {
        let check = "";
        if (cdres.alist.ansel[qnum].indexOf(i) > -1)
            check = "checked";
        html += `<div><input type="checkbox" style="order:${cdres.alist.arand[qnum][i-1]};" class="ansel_${qnum}" id="${i}" onchange="updateSelectedOptions('${qnum}')" ${check}><label style=style="order:${cdres.alist.arand[qnum][i-1]};" for="${i}">${cdres.alist.anset[qnum][i-1]}</label></div>`;
    }
    html += `</div><div id="score_${qnum}"></div>`;
    document.getElementById('output').innerHTML = html;
    console.log(cdres);
}

// Function to update the selected options string
function updateSelectedOptions(qnum) {
    const checkboxes = document.querySelectorAll(`input[class="ansel_${qnum}"]:checked`);
    cdres.alist.ansel[qnum] = Array.from(checkboxes).map(cb => parseInt(cb.id));
    cdres.score[qnum] = cdres.alist.ansrt[qnum].filter(value => cdres.alist.ansel[qnum].includes(value)).length;
    document.getElementById(`score_${qnum}`).innerHTML = `Question:${cdres.qlist.qcode[qnum]}<br>Score:${scoreCalc(qnum)}`;
}

function scoreCalc(qnum) {
    const s = cdres.score[qnum];
    const sl = cdres.alist.ansel[qnum].length;
    const c = cdres.alist.ansrt[qnum].length;
    return ((s/c)-((sl-s)/(optnum - c)));
}