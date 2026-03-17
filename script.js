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
    const correctPass = "123"; 

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

// --- 5. BILLING LOGIC (NO RELOAD) ---
window.updateBillTable = function() {
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
                <div style="display: flex; gap: 20px; justify-content: flex-start; align-items: center; padding: 10px 0;">
                    <span onclick="editItem(${index})" style="cursor:pointer; font-size:22px;">✏️</span>
                    <span onclick="removeItem(${index})" style="cursor:pointer; font-size:22px;">❌</span>
                </div>`;
            totalAmount += item.total;
        });
    }
    document.getElementById("totalAmount").innerText = totalAmount;
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
        
        // இன்புட்களை மட்டும் சுத்தம் செய்யவும்
        document.getElementById("itemName").value = "";
        document.getElementById("itemQty").value = "";
        document.getElementById("itemPrice").value = "";
        
        window.updateBillTable(); 
    }
}

window.generateBill = function() {
    let finalTotal = parseFloat(document.getElementById("totalAmount").innerText);
    let cName = document.getElementById("customerName").value.trim();
    let finalCustomerName = cName !== "" ? cName : "Cash Customer";
    
    if (finalTotal === 0 || items.length === 0) return alert("பில் காலியாக உள்ளது!");

    try {
        push(ref(db, 'dailySales'), {
            customerName: finalCustomerName,
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
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
            th { border-bottom: 1px dashed #000; text-align: left; }
            td { padding: 5px 0; }
            .total { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; text-align: right; font-weight: bold; }
        </style></head><body>
        <div class="header">
            <p style="font-size: 14px; margin: 0;">NIHA POS</p>
            <p style="font-size: 18px; font-weight: bold; margin: 0;">AYYAPPAN STORE</p>
            <p>No:135, P.H. ROAD, MADURAVOYAL</p>
            <p>Mobile: 9943514861</p>
            <hr>
            <p style="text-align:left; margin: 5px 0;">Date: ${new Date().toLocaleString()}</p>
            <p style="text-align:left; margin: 5px 0;"><b>Customer: ${finalCustomerName}</b></p>
        </div>
        <table><thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead><tbody>
        ${items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>${i.price}</td><td>${i.total}</td></tr>`).join('')}
        </tbody></table>
        <div class="total">Grand Total: ₹${finalTotal}</div>
        <div style="text-align:center; margin-top:20px;">Thank you! Visit Again!</div>
        </body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); window.clearBill(); }, 500);
}

// --- 6. INITIAL LOAD & UTILS ---
window.onload = function() {
    if (sessionStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("main-app").style.display = "block";
    }
    window.updateBillTable();
};

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

window.clearBill = function() { 
    items = [];
    localStorage.removeItem('myBillItems'); 
    window.updateBillTable();
}

window.removeItem = function(index) { 
    items.splice(index, 1); 
    localStorage.setItem('myBillItems', JSON.stringify(items)); 
    window.updateBillTable();
}

window.editItem = function(index) {
    let item = items[index];
    document.getElementById("itemName").value = item.name;
    document.getElementById("itemQty").value = item.qty;
    document.getElementById("itemPrice").value = item.price;
    editIndex = index;
    document.querySelector('button[onclick="addItem()"]').innerText = 'UPDATE';
}

window.deleteProduct = function(key) { if(confirm("Delete product?")) remove(ref(db, 'products/' + key)); }

// Sales Filter logic
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

window.resetFilter = function() {
    document.getElementById("searchDate").value = "";
    document.getElementById("filteredTotal").innerText = "0";
    location.reload(); // இங்கு ரீலோடு செய்யலாம் ஏனெனில் இது தனி பக்கம்
};