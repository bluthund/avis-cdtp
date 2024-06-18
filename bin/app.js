const url = './data/AV01_TPDB.db'; // Replace with your database URL
var ansRtNum = "";
let db;

// Initialize the database
fetch(url).then(res => res.arrayBuffer()).then(data => {
    return initSqlJs().then(SQL => {
        db = new SQL.Database(new Uint8Array(data));
    });
}).catch(err => console.error(err));

// Function to execute the query from the textbox
function executeQuery() {
    const query = document.getElementById('query').value;
    try {
        const results = db.exec(query);
        // Format results as an HTML table
        const output = document.getElementById('output');
        output.innerHTML = createTable(results);
    } catch (err) {
        console.error(err);
        alert('Error executing query: ' + err.message);
    }
}

function createTable(results) {
    if (results.length === 0) {
        return '<p>No results found.</p>';
    }
    let html = '<table border="0"><thead><tr>';
    // Add column headers
    results[0].columns.forEach(column => {
        html += `<th>${column}</th>`;
    });
    html += '</tr></thead><tbody>';
    // Add rows
    results[0].values.forEach(row => {
        html += '<tr>';
        row.forEach((value, index) => {
            if (results[0].columns[index] === 'ANSET')
                // var qcode = 
                html += `<td><div class="checkbox-container">${createCheckboxes(value)}</div></td>`;
            else
                html += `<td>${value}</td>`;
            if (results[0].columns[index] === 'ANSRT') {
                ansRtNum = value.split(',').map(Number);
                console.log('Right options:',ansRtNum);
            }
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

// Function to create checkboxes and shuffle them
function createCheckboxes(ansetString) {
    const options = ansetString.replace(/"/g,'').split(',');
    const optshuffle = new Array();
    var optnum = 4;
    let checkboxesHtml = '';
    options.every(function(option, index) {
        optshuffle.push(Math.floor(Math.random() * 10000));
        checkboxesHtml += `<input type="checkbox" style="order:${optshuffle[index]};" class="anset" id="${index}" onchange="updateSelectedOptions()"><label style="order:${optshuffle[index]};" for="${index}">${option}</label>`;
        optnum--;
        if(optnum != 0)
            return true;
    });
    return checkboxesHtml;
}

// Function to update the selected options string
function updateSelectedOptions() {
    const checkboxes = document.querySelectorAll('input[class="anset"]:checked');
    let selectedOptions = Array.from(checkboxes).map(cb => parseInt(cb.id)+1);
    console.log('Selected options:', selectedOptions);
    console.log('Correct options: ',ansRtNum.filter(value => selectedOptions.includes(value)).length);
}