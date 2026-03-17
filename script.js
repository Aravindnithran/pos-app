<<<<<<< HEAD
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDFsF9Ptip38ixPNSXDM8SpaTB7Rf4RH-M",
    authDomain: "h-pos-app.firebaseapp.com",
    databaseURL: "https://h-pos-app-default-rtdb.firebaseio.com",
    projectId: "h-pos-app",
    storageBucket: "h-pos-app.firebasestorage.app",
    messagingSenderId: "417866928315",
    appId: "1:417866928315:web:5864124e68e43e36ded99e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let items = JSON.parse(localStorage.getItem('myBillItems')) || [];
let cloudProducts = {}; 
let editIndex = -1; 

// --- 1. LOGIN LOGIC ---
window.checkLogin = function() {
    const pass = document.getElementById("adminPass").value;
    const correctPass = "123"; // உங்கள் பாஸ்வேர்ட் இங்கே உள்ளது

    if (pass === correctPass) {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("main-app").style.display = "block";
        sessionStorage.setItem("isLoggedIn", "true");
    } else {
        alert("தவறான பாஸ்வேர்ட்!");
    }
}

window.logout = function() {
    sessionStorage.removeItem("isLoggedIn");
    location.reload();
}

// --- 2. TAB MANAGEMENT ---
window.openTab = function(tabName) {
    let x = document.getElementsByClassName("tab-content");
    for (let i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";
}

// --- 3. CLOUD DATA LISTENER ---
onValue(ref(db, 'products'), (snapshot) => {
    const data = snapshot.val();
    const dataList = document.getElementById("productSuggestions");
    const tableBody = document.querySelector("#cloudProductTable tbody");
    cloudProducts = data; 

    if (dataList) {
        dataList.innerHTML = ""; 
        if (data) {
            Object.keys(data).forEach(key => {
                let option = document.createElement("option");
                option.value = data[key].productName;
                dataList.appendChild(option);
            });
        }
    }

    if (tableBody) {
        tableBody.innerHTML = ""; 
        if (data) {
            Object.keys(data).forEach(key => {
                let row = tableBody.insertRow();
                row.insertCell(0).innerText = data[key].productName;
                row.insertCell(1).innerText = "₹" + data[key].productPrice;
                
                let stockCell = row.insertCell(2);
                let currentStock = data[key].productStock || 0;
                stockCell.innerText = currentStock;
                if(currentStock <= 5) stockCell.style.color = "red"; 

                let editStockCell = row.insertCell(3);
                let stockBtn = document.createElement("button");
                stockBtn.innerText = "Update Stock";
                stockBtn.style.cssText = "background:#ffc107; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; font-weight:bold;";
                stockBtn.onclick = () => window.updateStockAmount(key, currentStock);
                editStockCell.appendChild(stockBtn);

                let deleteCell = row.insertCell(4);
                let btn = document.createElement("button");
                btn.innerText = "❌";
                btn.style.cssText = "background:none; border:none; color:red; cursor:pointer; font-size:18px;";
                btn.onclick = () => window.deleteProduct(key);
                deleteCell.appendChild(btn);
            });
        }
    }
});

// --- 4. STOCK & BILLING FUNCTIONS ---
window.updateStockAmount = function(key, currentStock) {
    let newAmount = prompt("புதிய ஸ்டாக் அளவைத் தட்டச்சு செய்யவும்:", currentStock);
    if (newAmount !== null && newAmount !== "") {
        let updatedStock = parseInt(newAmount);
        if (!isNaN(updatedStock)) {
            set(ref(db, 'products/' + key + '/productStock'), updatedStock)
            .then(() => alert("Stock Updated!"));
        }
    }
};

window.fillPrice = function() {
    let name = document.getElementById("itemName").value;
    const stockDisplay = document.getElementById("stockDisplay");
    if (cloudProducts) {
        let found = false;
        Object.keys(cloudProducts).forEach(key => {
            if (cloudProducts[key].productName === name) {
                document.getElementById("itemPrice").value = cloudProducts[key].productPrice;
                let currentStock = cloudProducts[key].productStock || 0;
                stockDisplay.innerText = "Stock: " + currentStock;
                stockDisplay.style.color = currentStock <= 5 ? "red" : "green";
                found = true;
            }
        });
        if (!found) stockDisplay.innerText = "Stock: -";
    }
}

window.addItem = function() {
    let name = document.getElementById("itemName").value;
    let qty = parseInt(document.getElementById("itemQty").value);
    let price = parseFloat(document.getElementById("itemPrice").value);

    if (name && qty && price) {
        let currentStock = 0;
        Object.keys(cloudProducts).forEach(key => {
            if (cloudProducts[key].productName === name) currentStock = cloudProducts[key].productStock || 0;
        });

        if (qty > currentStock) {
            alert("போதிய ஸ்டாக் இல்லை! (Available: " + currentStock + ")");
            return;
        }

        let item = { name, qty, price, total: qty * price };
        if (editIndex === -1) {
            items.push(item);
        } else {
            items[editIndex] = item;
            editIndex = -1;
            document.querySelector('button[onclick="addItem()"]').innerText = 'ADD';
        }
        localStorage.setItem('myBillItems', JSON.stringify(items));
        location.reload(); 
    }
}

window.generateBill = function() {
    let finalTotal = parseFloat(document.getElementById("totalAmount").innerText);
    let cName = document.getElementById("customerName").value.trim();
    
    if (finalTotal === 0 || items.length === 0) return alert("பில் காலியாக உள்ளது!");

    try {
        push(ref(db, 'dailySales'), {
            customerName: cName || "Cash Customer",
            amount: finalTotal,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            items: items 
        });

        items.forEach(billItem => {
            Object.keys(cloudProducts).forEach(key => {
                if (cloudProducts[key].productName === billItem.name) {
                    let newStock = (cloudProducts[key].productStock || 0) - billItem.qty;
                    set(ref(db, 'products/' + key + '/productStock'), newStock);
                }
            });
        });
    } catch (e) { console.error(e); }

    let printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><style>
            body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { border-bottom: 1px dashed #000; text-align: left; }
            .total { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; text-align: right; font-weight: bold; }
        </style></head><body>
        <div class="header">
            <p style="font-size: 14px; margin: 0;">NIHA POS</p>
            <p style="font-size: 18px; font-weight: bold; margin: 0;">AYYAPPAN STORE</p>
            <p>No:135, P.H. ROAD, MADURAVOYAL</p>
            <p>Mobile: 9943514861</p>
            <p style="font-size: 11px;">Date: ${new Date().toLocaleString()}</p>
            ${cName ? `<p style="font-size: 13px; text-align:left;"><b>Customer: ${cName}</b></p>` : ''}
        </div>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>
        ${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.total}</td></tr>`).join('')}
        </tbody></table>
        <div class="total">Grand Total: ₹${finalTotal}</div>
        <div style="text-align:center; margin-top:20px;">Thank you! Visit Again!</div>
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); window.clearBill(); }, 500);
}

// --- 5. INITIAL LOAD & UTILS ---
window.onload = function() {
    // லாகின் சரிபார்ப்பு
    if (sessionStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("main-app").style.display = "block";
    }

    let table = document.querySelector("#billTable tbody");
    let totalAmount = 0;
    if (table) {
        table.innerHTML = ""; 
        items.forEach((item, index) => {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.name;
            row.insertCell(1).innerText = item.qty;
            row.insertCell(2).innerText = "₹" + item.price;
            row.insertCell(3).innerText = "₹" + item.total;
            let actionCell = row.insertCell(4);
            actionCell.innerHTML = `
                  <div class="action-div">
                   <span onclick="editItem(${index})" style="cursor:pointer; font-size:20px;">✏️</span>
                   <span onclick="removeItem(${index})" style="cursor:pointer; font-size:20px;">❌</span>
                </div>`;  
            totalAmount += item.total;
        });
    }
    document.getElementById("totalAmount").innerText = totalAmount;
};

// --- Daily Sales Listener ---
onValue(ref(db, 'dailySales'), (snapshot) => {
    const salesData = snapshot.val();
    let todaySum = 0;
    const today = new Date().toLocaleDateString();
    const reportTableBody = document.querySelector("#salesReportTable tbody");
    if (salesData) {
        Object.keys(salesData).forEach(key => { if (salesData[key].date === today) todaySum += parseFloat(salesData[key].amount || 0); });
        if (reportTableBody) {
            reportTableBody.innerHTML = "";
            Object.keys(salesData).reverse().forEach(key => {
                let row = reportTableBody.insertRow();
                row.insertCell(0).innerText = `${salesData[key].date} ${salesData[key].time}`;
                row.insertCell(1).innerText = "₹" + salesData[key].amount;
                row.insertCell(2).innerHTML = `<button onclick="alert('பொருட்கள்: ' + '${salesData[key].items.map(i => i.name).join(", ")}')" style="padding:5px;">View</button>`;
            });
        }
    }
    if(document.getElementById("todayTotal")) document.getElementById("todayTotal").innerText = todaySum;
});

window.saveToCloud = function() {
    const name = document.getElementById("pName").value;
    const price = document.getElementById("pPrice").value;
    const stock = document.getElementById("pStock").value;
    if(name && price && stock) {
        push(ref(db, 'products'), { productName: name, productPrice: price, productStock: parseInt(stock) })
        .then(() => { alert("Saved!"); document.getElementById("pName").value = ""; document.getElementById("pPrice").value = ""; document.getElementById("pStock").value = ""; });
    }
}

window.clearBill = function() { localStorage.removeItem('myBillItems'); location.reload(); }
window.removeItem = function(index) { items.splice(index, 1); localStorage.setItem('myBillItems', JSON.stringify(items)); location.reload(); }
window.editItem = function(index) {
    let item = items[index];
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.qty;
    document.getElementById("itemPrice").value = item.price;
    editIndex = index;
    document.querySelector('button[onclick="addItem()"]').innerText = 'UPDATE';
}
window.deleteProduct = function(key) { if(confirm("Delete product?")) remove(ref(db, 'products/' + key)); }

// Filter logic
window.filterByDate = function() {
    const searchDate = document.getElementById("searchDate").value;
    if (!searchDate) return alert("தேதியைத் தேர்ந்தெடுக்கவும்!");
    const formattedDate = new Date(searchDate).toLocaleDateString();
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        const reportTableBody = document.querySelector("#salesReportTable tbody");
        let filteredSum = 0;
        if (reportTableBody && salesData) {
            reportTableBody.innerHTML = "";
            Object.keys(salesData).forEach(key => {
                if (salesData[key].date === formattedDate) {
                    filteredSum += parseFloat(salesData[key].amount);
                    let row = reportTableBody.insertRow();
                    row.insertCell(0).innerText = `${salesData[key].date} ${salesData[key].time}`;
                    row.insertCell(1).innerText = "₹" + salesData[key].amount;
                    row.insertCell(2).innerHTML = `<button onclick="alert('பொருட்கள்: ' + '${salesData[key].items.map(i => i.name).join(", ")}')" style="padding:5px;">View</button>`;
                }
            });
            document.getElementById("filteredTotal").innerText = filteredSum;
        }
    }, { onlyOnce: true });
};

window.resetFilter = function() { location.reload(); }
=======
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyDFsF9Ptip38ixPNSXDM8SpaTB7Rf4RH-M",
    authDomain: "h-pos-app.firebaseapp.com",
    databaseURL: "https://h-pos-app-default-rtdb.firebaseio.com",
    projectId: "h-pos-app",
    storageBucket: "h-pos-app.firebasestorage.app",
    messagingSenderId: "417866928315",
    appId: "1:417866928315:web:5864124e68e43e36ded99e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let items = JSON.parse(localStorage.getItem('myBillItems')) || [];
let cloudProducts = {}; 
let editIndex = -1; 

// Tab மாற்றும் வசதி
window.openTab = function(tabName) {
    let i, x = document.getElementsByClassName("tab-content");
    for (i = 0; i < x.length; i++) x[i].style.display = "none";
    document.getElementById(tabName).style.display = "block";
}

// Cloud-ல் இருந்து டேட்டாவை எடுத்தல்
onValue(ref(db, 'products'), (snapshot) => {
    const data = snapshot.val();
    const dataList = document.getElementById("productSuggestions");
    if (!dataList) return;
    dataList.innerHTML = ""; 
    cloudProducts = data; 
    if (data) {
        Object.keys(data).forEach(key => {
            let option = document.createElement("option");
            option.value = data[key].productName;
            dataList.appendChild(option);
        });
    }
});

window.fillPrice = function() {
    let name = document.getElementById("itemName").value;
    if (cloudProducts) {
        Object.keys(cloudProducts).forEach(key => {
            if (cloudProducts[key].productName === name) {
                document.getElementById("itemPrice").value = cloudProducts[key].productPrice;
            }
        });
    }
}

window.saveToCloud = function() {
    const name = document.getElementById("pName").value;
    const price = document.getElementById("pPrice").value;
    if(name && price) {
        push(ref(db, 'products'), { productName: name, productPrice: price });
        alert("Saved to Cloud!");
        document.getElementById("pName").value = "";
        document.getElementById("pPrice").value = "";
    }
}

window.addItem = function() {
    let name = document.getElementById("itemName").value;
    let qty = parseInt(document.getElementById("itemQty").value);
    let price = parseFloat(document.getElementById("itemPrice").value);

    if (name && qty && price) {
        let item = { name, qty, price, total: qty * price };
        if (editIndex === -1) {
            items.push(item);
        } else {
            items[editIndex] = item;
            editIndex = -1;
            document.querySelector('button[onclick="addItem()"]').innerText = 'ADD';
        }
        localStorage.setItem('myBillItems', JSON.stringify(items));
        location.reload(); 
    }
}

window.editItem = function(index) {
    let item = items[index];
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.qty;
    document.getElementById("itemPrice").value = item.price;
    editIndex = index;
    document.querySelector('button[onclick="addItem()"]').innerText = 'UPDATE';
}

window.generateBill = function() {
    let printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write('<html><head><title>Bill Print</title>');
    printWindow.document.write(`
        <style>
            body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 300px; 
                margin: 0 auto; 
                padding: 10px;
                color: #000;
            }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .store-name { font-size: 22px; font-weight: bold; margin: 0; }
            .store-address { font-size: 12px; margin: 5px 0; }
            .store-phone { font-size: 14px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { border-bottom: 1px dashed #000; text-align: left; font-size: 13px; }
            td { padding: 5px 0; font-size: 13px; }
            .total-section { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; text-align: right; }
            .total-amount { font-size: 18px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; font-style: italic; }
            @media print { .no-print { display: none; } }
        </style>
    `);
    printWindow.document.write('</head><body>');

    // கடையின் விவரங்கள்
    printWindow.document.write(`
        <div class="header">
            <p class="store-name">AYYAPPAN STORE</p>
            <p class="store-address">No:135, P.H. ROAD, MADURAVOYAL</p>
            <p class="store-phone">Mobile: 9943514861</p>
            <p style="font-size: 11px;">Date: ${new Date().toLocaleString()}</p>
        </div>
    `);

    // பொருட்கள் பட்டியல்
    printWindow.document.write('<table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>');
    items.forEach(item => {
        printWindow.document.write(`
            <tr>
                <td>${item.name}</td>
                <td>${item.qty}</td>
                <td>${item.price}</td>
                <td>${item.total}</td>
            </tr>
        `);
    });
    printWindow.document.write('</tbody></table>');

    // மொத்தத் தொகை
    let finalTotal = document.getElementById("totalAmount").innerText;
    printWindow.document.write(`
        <div class="total-section">
            <span class="total-amount">Grand Total: ₹${finalTotal}</span>
        </div>
    `);

    // நன்றியுரை
    printWindow.document.write(`
        <div class="footer">
            <p>Thank you! Visit Again!</p>
        </div>
    `);

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    
    // மொபைலில் பிரிண்ட் டயலாக் வர சிறிது நேரம் தேவைப்படும்
    setTimeout(() => {
        printWindow.print();
    }, 500);
}
window.clearBill = function() { localStorage.removeItem('myBillItems'); location.reload(); }

window.onload = function() {
    let table = document.querySelector("#billTable tbody");
    let totalAmount = 0;
    table.innerHTML = ""; // டேபிளை முதலில் காலி செய்ய

    items.forEach((item, index) => {
        let row = table.insertRow();
        row.insertCell(0).innerText = item.name;
        row.insertCell(1).innerText = item.qty;
        row.insertCell(2).innerText = "₹" + item.price;
        row.insertCell(3).innerText = "₹" + item.total;
        
        // Remove பட்டன் சேர்த்தல்
        let actionCell = row.insertCell(4);
        let removeBtn = document.createElement("button");
        removeBtn.innerHTML = "❌";
        removeBtn.style.cssText = "background:none; border:none; color:red; cursor:pointer; font-size:18px;";
        removeBtn.onclick = function() {
            removeItem(index);
        };
        actionCell.appendChild(removeBtn);

        totalAmount += item.total;
    });
    document.getElementById("totalAmount").innerText = totalAmount;
};
window.removeItem = function(index) {
    if(confirm("இந்த பொருளை நீக்க வேண்டுமா?")) {
        items.splice(index, 1); // குறிப்பிட்ட பொருளை மட்டும் நீக்குதல்
        localStorage.setItem('myBillItems', JSON.stringify(items));
        location.reload(); // பக்கத்தை புதுப்பித்து டேபிளை அப்டேட் செய்தல்
    }
}
//////////////////////////////////////////////////////////////////////////
window.showReport = function() {
    let list = document.getElementById('reportList');
    list.innerHTML = "";
    items.forEach(item => {
        let li = document.createElement('li');
        li.innerText = `${item.name} - ₹${item.total}`;
        list.appendChild(li);
    });
    document.getElementById('reportSection').style.display = "block";
}

///////////////////////////////////////////////////////////////////////////////
import { remove } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

// கிளவுட் டேபிளை அப்டேட் செய்யும் பங்க்ஷன்
onValue(ref(db, 'products'), (snapshot) => {
    const data = snapshot.val();
    const tableBody = document.querySelector("#cloudProductTable tbody");
    if(!tableBody) return;
    tableBody.innerHTML = ""; // பழைய டேட்டாவை நீக்க

    if (data) {
        Object.keys(data).forEach(key => {
            let row = tableBody.insertRow();
            row.insertCell(0).innerText = data[key].productName;
            row.insertCell(1).innerText = "₹" + data[key].productPrice;
            
            // Delete பட்டன்
            let deleteCell = row.insertCell(2);
            let btn = document.createElement("button");
            btn.innerText = "❌";
            btn.style.background = "none";
            btn.onclick = () => deleteProduct(key);
            deleteCell.appendChild(btn);
        });
    }
});

// கிளவுடில் இருந்து பொருளை நீக்க
window.deleteProduct = function(key) {
    if(confirm("நிச்சயமாக இந்த பொருளை நீக்க வேண்டுமா?")) {
        remove(ref(db, 'products/' + key))
        .then(() => alert("Product deleted!"));
    }
}
>>>>>>> 896ebbe (updated bill)
