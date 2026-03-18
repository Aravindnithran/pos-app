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
    let cMobile = document.getElementById("customerMobile").value.trim();
    let finalCustomerName = cName !== "" ? cName : "Cash Customer";
    
    if (finalTotal === 0 || items.length === 0) return alert("பில் காலியாக உள்ளது!");

    // --- FIREBASE சேமிப்பு ---
    try {
        push(ref(db, 'dailySales'), {
            customerName: finalCustomerName,
            customerMobile: cMobile,
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
    } catch (e) { console.error("Firebase Error:", e); }

    // --- பில் டிசைன் (HD Image-ஆக மாற்றுவதற்காக) ---
    let billDiv = document.createElement("div");
    // தெளிவுக்காக வெள்ளை பின்னணி மற்றும் பார்டர் சேர்த்துள்ளேன்
    billDiv.style.cssText = "width:380px; padding:30px; background:#fff; color:#000; font-family:'Helvetica', Arial, sans-serif; position:fixed; top:-9999px; left:-9999px; border: 1px solid #eee;";
    
    billDiv.innerHTML = `
        <div style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 15px; margin-bottom: 15px;">
            <h1 style="margin: 0; font-size: 26px; letter-spacing: 1px;">AYYAPPAN STORE</h1>
            <p style="margin: 5px 0; font-size: 14px;">No:135, P.H. ROAD, MADURAVOYAL</p>
            <p style="margin: 5px 0; font-size: 14px; font-weight: bold;">Cell: 9943514861</p>
        </div>
        <div style="margin-bottom: 15px; font-size: 14px; display: flex; justify-content: space-between;">
            <span><b>Date:</b> ${new Date().toLocaleDateString()}</span>
            <span><b>Time:</b> ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="margin-bottom: 15px; font-size: 14px;">
            <p style="margin: 0;"><b>Customer:</b> ${finalCustomerName}</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="border-bottom: 2px solid #000;">
                    <th style="text-align: left; padding: 8px 0;">ITEM</th>
                    <th style="text-align: center;">QTY</th>
                    <th style="text-align: center;">RATE</th>
                    <th style="text-align: right;">AMOUNT</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(i => `
                    <tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px 0; font-weight: bold;">${i.name}</td>
                        <td style="text-align: center;">${parseFloat(i.qty).toFixed(3)}</td>
                        <td style="text-align: center;">${parseFloat(i.price).toFixed(2)}</td>
                        <td style="text-align: right;">${parseFloat(i.total).toFixed(2)}</td>
                    </tr>`).join('')}
            </tbody>
        </table>
        <div style="margin-top: 20px; border-top: 3px solid #000; padding-top: 15px; text-align: right;">
            <span style="font-size: 14px; font-weight: bold;">GRAND TOTAL</span><br>
            <b style="font-size: 24px;">₹${finalTotal.toFixed(2)}</b>
        </div>
        <div style="text-align: center; margin-top: 30px; font-size: 13px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <p style="margin: 3px 0; font-weight: bold;">Thank you! Visit Again!</p>
            <p style="margin: 3px 0; color: #777;">Digital Receipt via NIHA POS</p>
        </div>
    `;
    document.body.appendChild(billDiv);

    // --- HTML-ஐ HD படமாக மாற்றுதல் (SCALE: 3) ---
    html2canvas(billDiv, {
        scale: 3, // இதுதான் படத்தின் தரத்தை (Quality) கூட்டும்
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
    }).then(canvas => {
        canvas.toBlob(blob => {
            const file = new File([blob], `Bill_${finalCustomerName}.png`, { type: "image/png" });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({
                    files: [file],
                    title: 'AYYAPPAN STORE - Bill',
                    text: `Bill for ${finalCustomerName}`
                }).then(() => {
                    cleanup();
                }).catch(() => {
                    cleanup();
                });
            } else {
                let link = document.createElement("a");
                link.download = `Bill_${finalCustomerName}.png`;
                link.href = canvas.toDataURL("image/png", 1.0);
                link.click();
                cleanup();
            }
        }, "image/png", 1.0);
    });

    function cleanup() {
        document.body.removeChild(billDiv);
        document.getElementById("customerName").value = "";
        document.getElementById("customerMobile").value = "";
        window.clearBill();
    }
};

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


///////////////////////////////////////////sales report password set/////////////////////////////////////////////

// ஒரு குறிப்பிட்ட சேல்ஸ் டேட்டாவை மட்டும் நீக்க:
window.deleteSaleItem = function(saleId) {
    // 1. முதலில் ரகசிய பாஸ்வேர்ட் கேட்கும்
    let password = prompt("இந்த விற்பனையை நீக்க ரகசிய கடவுச்சொல்லை (Password) உள்ளிடவும்:");
    
    // 2. பாஸ்வேர்ட் சரிபார்ப்பு (இங்கே 1234-க்கு பதில் உங்கள் பாஸ்வேர்டை மாற்றிக்கொள்ளுங்கள்)
    const SECRET_KEY = "1"; 

    if (password === null) return; // 'Cancel' அழுத்தினால் வெளியேறும்

    if (password === SECRET_KEY) {
        if (confirm("நிச்சயமாக இந்த ஒரு விற்பனை கணக்கை மட்டும் நீக்க வேண்டுமா?")) {
            const itemRef = ref(db, 'dailySales/' + saleId);
            
            remove(itemRef)
            .then(() => {
                alert("விற்பனை வெற்றிகரமாக நீக்கப்பட்டது!");
                // டேபிளை மீண்டும் புதுப்பிக்க (Update)
                if(typeof window.loadSales === 'function') window.loadSales();
            })
            .catch((error) => {
                alert("நீக்குவதில் சிக்கல்: " + error.message);
            });
        }
    } else {
        alert("தவறான பாஸ்வேர்ட்! உங்களால் நீக்க முடியாது.");
    }
}