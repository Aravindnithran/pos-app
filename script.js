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
        let updatedStock = parseFloat(newAmount); // Changed to parseFloat for decimals in stock
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
            // Qty-ஐ 0.500 என்று காட்ட .toFixed(3) சேர்த்துள்ளேன்
            row.insertCell(1).innerText = parseFloat(item.qty).toFixed(3);
            row.insertCell(2).innerText = "₹" + parseFloat(item.price).toFixed(2);
            row.insertCell(3).innerText = "₹" + parseFloat(item.total).toFixed(2);
            let actionCell = row.insertCell(4);
            actionCell.innerHTML = `
                <div style="display: flex; gap: 20px; justify-content: flex-start; align-items: center; padding: 10px 0;">
                    <span onclick="editItem(${index})" style="cursor:pointer; font-size:22px;">✏️</span>
                    <span onclick="removeItem(${index})" style="cursor:pointer; font-size:22px;">❌</span>
                </div>`;
            totalAmount += item.total;
        });
    }
    document.getElementById("totalAmount").innerText = totalAmount.toFixed(2);
}

window.addItem = function() {
    let name = document.getElementById("itemName").value;
    let qty = parseFloat(document.getElementById("itemQty").value); 
    let price = parseFloat(document.getElementById("itemPrice").value);

    if (name && !isNaN(qty) && qty > 0 && !isNaN(price)) {
        let currentStock = 0;
        Object.keys(cloudProducts).forEach(key => {
            if (cloudProducts[key].productName === name) {
                currentStock = parseFloat(cloudProducts[key].productStock) || 0;
            }
        });

        if (qty > currentStock) {
            alert("போதிய ஸ்டாக் இல்லை! (Available: " + currentStock + ")");
            return;
        }

        let total = parseFloat((qty * price).toFixed(2));
        let item = { name, qty, price, total: total };

        if (editIndex === -1) {
            items.push(item);
        } else {
            items[editIndex] = item;
            editIndex = -1;
            document.querySelector('button[onclick="addItem()"]').innerText = 'ADD';
        }

        localStorage.setItem('myBillItems', JSON.stringify(items));
        
        document.getElementById("itemName").value = "";
        document.getElementById("itemQty").value = "";
        document.getElementById("itemPrice").value = "";
        document.getElementById("liveTotalDisplay").innerText = "Amount: ₹ 0.00"; 
        
        window.updateBillTable(); 
    } else {
        alert("தயவுசெய்து பெயர், அளவு மற்றும் சரியான விலையை உள்ளிடவும்!");
    }
}

window.updateLiveTotal = function() {
    let qty = parseFloat(document.getElementById('itemQty').value) || 0;
    let rate = parseFloat(document.getElementById('itemPrice').value) || 0;
    let liveTotal = qty * rate;
    document.getElementById('liveTotalDisplay').innerText = "Amount: ₹ " + liveTotal.toFixed(2);
};

window.generateBill = function() {
    let finalTotal = parseFloat(document.getElementById("totalAmount").innerText);
    let cName = document.getElementById("customerName").value.trim();
    let cMobile = document.getElementById("customerMobile").value.trim(); // மொபைல் எண் வாங்குதல்
    let finalCustomerName = cName !== "" ? cName : "Cash Customer";
    
    if (finalTotal === 0 || items.length === 0) return alert("பில் காலியாக உள்ளது!");

    // --- FIREBASE சேமிப்பு ---
    try {
        push(ref(db, 'dailySales'), {
            customerName: finalCustomerName,
            customerMobile: cMobile, // மொபைல் எண்ணையும் டேட்டாபேஸில் சேமிக்கிறோம்
            amount: finalTotal,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            items: items 
        });

        // ஸ்டாக் குறைக்கும் லாஜிக் (ஏற்கனவே உள்ளது)
        items.forEach(billItem => {
            Object.keys(cloudProducts).forEach(key => {
                if (cloudProducts[key].productName === billItem.name) {
                    let newStock = (cloudProducts[key].productStock || 0) - billItem.qty;
                    set(ref(db, 'products/' + key + '/productStock'), newStock);
                }
            });
        });
    } catch (e) { console.error(e); }

    // --- பிரிண்ட் விண்டோ (3-Inch Thermal Design) ---
    let printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html><head><style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: 'Arial', sans-serif; width: 72mm; margin: 0 auto; padding: 5px; font-size: 13px; line-height: 1.2; }
            .header { text-align: center; }
            .store-name { font-size: 18px; font-weight: bold; margin: 0; }
            .dashed-line { border-top: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; border-bottom: 1px dashed #000; padding: 3px 0; }
            td { padding: 4px 0; }
            .total-row { font-weight: bold; font-size: 15px; margin-top: 10px; text-align: right; }
        </style></head><body>
        <div class="header">
            <p class="store-name">AYYAPPAN STORE</p>
            <p>No:135, P.H. ROAD, MADURAVOYAL</p>
            <p>Cell: 9943514861</p>
            <div class="dashed-line"></div>
            <p style="text-align:left;">Date: ${new Date().toLocaleString()}</p>
            <p style="text-align:left;"><b>Cust: ${finalCustomerName} ${cMobile ? '('+cMobile+')' : ''}</b></p>
            <div class="dashed-line"></div>
        </div>
        <table>
            <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Total</th></tr></thead>
            <tbody>
            ${items.map(i => `<tr><td>${i.name}</td><td>${parseFloat(i.qty).toFixed(3)}</td><td>${i.price}</td><td style="text-align:right;">${i.total.toFixed(2)}</td></tr>`).join('')}
            </tbody>
        </table>
        <div class="dashed-line"></div>
        <div class="total-row">Grand Total: ₹${finalTotal.toFixed(2)}</div>
        <div class="dashed-line"></div>
        <p style="text-align:center; font-size:11px;">Thank you! Visit Again!</p>
        </body></html>
    `);
    // ... மேலே உள்ள கோடுகள் அப்படியே இருக்கட்டும் ...

    printWindow.document.close();

    // வாட்ஸ்அப் மெசேஜ் டெக்ஸ்ட்
    let billSummary = `*AYYAPPAN STORE - BILL*%0A`;
    billSummary += `Date: ${new Date().toLocaleDateString()}%0A`;
    billSummary += `Customer: ${finalCustomerName}%0A`;
    billSummary += `--------------------------%0A`;
    items.forEach(i => {
        billSummary += `${i.name} - ${parseFloat(i.qty).toFixed(3)} x ${i.price} = ₹${i.total.toFixed(2)}%0A`;
    });
    billSummary += `--------------------------%0A`;
    billSummary += `*Grand Total: ₹${finalTotal.toFixed(2)}*%0A`;
    billSummary += `Thank you! Visit Again!`;

    // முக்கியமான மாற்றம் இங்கே:
    setTimeout(() => { 
        printWindow.print(); 
        
        // பிரிண்ட் கொடுத்த பிறகு, 1 வினாடி கழித்து வாட்ஸ்அப் கேட்கும்
        setTimeout(() => {
            if(confirm("பில்லை WhatsApp-ல் அனுப்பலாமா?")) {
                let waLink = cMobile !== "" 
                    ? `https://wa.me/91${cMobile}?text=${billSummary}` 
                    : `https://wa.me/?text=${billSummary}`;
                
                // புதிய டேப்பில் வாட்ஸ்அப் திறக்கும்
                window.open(waLink, '_blank');
            }
            
            // எல்லாம் முடிந்த பிறகு விண்டோவை மூடி, பில்லை கிளியர் செய்யவும்
            printWindow.close(); 
            document.getElementById("customerName").value = "";
            document.getElementById("customerMobile").value = "";
            window.clearBill();
        }, 1000); 

    }, 500);
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
    if(document.getElementById("todayTotal")) document.getElementById("todayTotal").innerText = todaySum.toFixed(2);
});

window.saveToCloud = function() {
    const name = document.getElementById("pName").value;
    const price = document.getElementById("pPrice").value;
    const stock = document.getElementById("pStock").value;
    if(name && price && stock) {
        push(ref(db, 'products'), { productName: name, productPrice: price, productStock: parseFloat(stock) })
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
    window.updateLiveTotal(); // Update live total when editing
}

window.deleteProduct = function(key) { if(confirm("Delete product?")) remove(ref(db, 'products/' + key)); }

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
            document.getElementById("filteredTotal").innerText = filteredSum.toFixed(2);
        }
    }, { onlyOnce: true });
};

window.resetFilter = function() {
    document.getElementById("searchDate").value = "";
    document.getElementById("filteredTotal").innerText = "0";
    location.reload(); 
};