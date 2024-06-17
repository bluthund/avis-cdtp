let db;

const aesKey = "mySecretAESKey"; // Replace with your actual secret key

function encryptAES(plaintext) {
    const encrypted = CryptoJS.AES.encrypt(plaintext, aesKey).toString();
    return encrypted;
}

function decryptAES(ciphertext) {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, aesKey).toString(CryptoJS.enc.Utf8);
    return decrypted;
}

function enCipher() {
    const originalText = document.getElementById('textBox').value;
    const encryptedText = encryptAES(originalText);
    document.getElementById('textBox').value = encryptedText;
}

function deCipher() {
    const encryptedText = document.getElementById('textBox').value;
    const decryptedText = decryptAES(encryptedText);
    document.getElementById('textBox').value = decryptedText;
}

async function readFileAsUint8Array(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const uint8Array = new Uint8Array(arrayBuffer);
            resolve(uint8Array);
        };
        reader.onerror = (error) => {
            reject(error);
        };
        reader.readAsArrayBuffer(file);
    });
}

async function loadDatabase() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const uint8Array = await readFileAsUint8Array(file);

    const config = {
        locateFile: (filename) => `/dist/${filename}`
    };

    initSqlJs(config).then((SQL) => {
        db = new SQL.Database(uint8Array);

        // Example: Create a table
        // db.run("CREATE TABLE test (col1, col2);");

        // Example: Insert two rows: (1,111) and (2,222)
        // db.run("INSERT INTO test VALUES (?,?), (?,?)", [1, 111, 2, 222]);

        // Example: Prepare a statement and retrieve data
        // const stmt = db.prepare("SELECT * FROM ADMIN");
        // while (stmt.step()) {
        //    const row = stmt.getAsObject();
        //    console.log('Here is a row:', row);
        //}

        // Close the database when done
        // db.close();
    });
}

function executeQuery() {
    const query = document.getElementById('sqlQuery').value;

    try {
        const result = db.exec(query);
        displayResult(result);
    } catch (error) {
        displayError('Error executing query: ' + error.message);
    }

}

function displayResult(result) {
    const table = document.getElementById('resultTable');
    table.innerHTML = ''; // Clear previous results

    if (result.length === 0) {
        table.innerHTML = '<p>No results found.</p>';
        return;
    }

    const rows = result[0].values;
    const columns = result[0].columns;

    const tableHtml = `
        <table style="border:none; border-spacing:20px;">
            <thead>
                <tr>${columns.map(col => `<th>${col}</th>`).join('')}</tr>
            </thead>
            <tbody>
                ${rows.map(row => `<tr>${row.map(val => `<td>${val}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>
    `;
    table.innerHTML = tableHtml;
}

function displayError(errorMessage) {
    const table = document.getElementById('resultTable');
    table.innerHTML = `<p>Error: ${errorMessage}</p>`;
}
