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
        let updatedStock = parseFloat(newAmount);
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

// --- 5. BILLING LOGIC ---
window.updateBillTable = function() {
    let table = document.querySelector("#billTable tbody");
    let totalAmount = 0;
    if (table) {
        table.innerHTML = ""; 
        items.forEach((item, index) => {
            let row = table.insertRow();
            row.insertCell(0).innerText = item.name;
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
    let pType = document.getElementById("paymentType").value;
    let finalCustomerName = cName !== "" ? cName : "Cash Customer";
    
    if (finalTotal === 0 || items.length === 0) return alert("பில் காலியாக உள்ளது!");

    try {
        push(ref(db, 'dailySales'), {
            customerName: finalCustomerName,
            customerMobile: cMobile,
            amount: finalTotal,
            paymentType: pType,
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

    let billDiv = document.createElement("div");
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

    html2canvas(billDiv, {
        scale: 3,
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
                }).then(() => cleanup()).catch(() => cleanup());
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

// --- 6. INITIAL LOAD ---
window.onload = function() {
    if (sessionStorage.getItem("isLoggedIn") === "true") {
        document.getElementById("login-section").style.display = "none";
        document.getElementById("main-app").style.display = "block";
    }
    window.updateBillTable();
};

// --- 7. RENDER SALES TABLE (UPDATED WITH MULTI-TOTAL) ---
function renderSalesTable(salesData, filterDate = null) {
    const reportTableBody = document.querySelector("#salesReportTable tbody");
    if (!reportTableBody) return;

    reportTableBody.innerHTML = "";
    
    // தனித்தனி டோட்டல் கணக்கிட வேரியபிள்கள்
    let cashTotal = 0;
    let gpayTotal = 0;
    let creditTotal = 0;
    let grandTotal = 0;

    if (salesData) {
        Object.keys(salesData).reverse().forEach(key => {
            const sale = salesData[key];
            
            if (!filterDate || sale.date === filterDate) {
                let amt = parseFloat(sale.amount || 0);
                grandTotal += amt;

                // பேமெண்ட் டைப் படி பிரித்து கூட்டுதல்
                let pType = sale.paymentType || 'Cash';
                if(pType === "Cash") cashTotal += amt;
                else if(pType === "GPay") gpayTotal += amt;
                else if(pType === "Credit") creditTotal += amt;

                let row = reportTableBody.insertRow();
                row.insertCell(0).innerText = `${sale.date} ${sale.time}`;

                let payColor = "green"; 
                if(pType === "GPay") payColor = "blue";
                if(pType === "Credit") payColor = "red";

                let amountCell = row.insertCell(1);
                amountCell.innerHTML = `
                    <div style="font-weight:bold;">₹${amt.toFixed(2)}</div>
                    <div style="font-size:11px; color:${payColor}; font-weight:bold;">● ${pType}</div>
                `;

                let actionCell = row.insertCell(2);
                actionCell.style.display = "flex";
                actionCell.style.gap = "10px";
                actionCell.innerHTML = `
                    <button onclick='window.showSaleDetails(${JSON.stringify(sale.items)}, "${sale.customerName}", "${sale.customerMobile}")' 
                            style="padding:5px 10px; cursor:pointer; background:#000; color:#fff; border:none; border-radius:3px;">View</button>
                    <button onclick='window.editOldBill("${key}", ${JSON.stringify(sale)})' 
                            style="padding:5px 10px; cursor:pointer; background:#2196F3; color:#fff; border:none; border-radius:3px;">✏️</button>
                    <button onclick="window.deleteSaleItem('${key}')" 
                            style="padding:5px 10px; cursor:pointer; background:#ff4d4d; color:#fff; border:none; border-radius:3px;">🗑️</button>
                `;
            }
        });
    }

    // ரிப்போர்ட் பக்கத்தில் டோட்டல்களைக் காட்டுதல்
    if(document.getElementById("cashTotalDisp")) document.getElementById("cashTotalDisp").innerText = cashTotal.toFixed(2);
    if(document.getElementById("gpayTotalDisp")) document.getElementById("gpayTotalDisp").innerText = gpayTotal.toFixed(2);
    if(document.getElementById("creditTotalDisp")) document.getElementById("creditTotalDisp").innerText = creditTotal.toFixed(2);
    
    // பொதுவான டோட்டல் (Today/Filtered)
    const todayDisp = document.getElementById("todayTotal");
    const filteredDisp = document.getElementById("filteredTotal");
    if (filterDate) { if (filteredDisp) filteredDisp.innerText = grandTotal.toFixed(2); } 
    else { if (todayDisp) todayDisp.innerText = grandTotal.toFixed(2); }
}

// --- 8. SALES DATA LISTENER ---
onValue(ref(db, 'dailySales'), (snapshot) => {
    const salesData = snapshot.val();
    const today = new Date().toLocaleDateString();
    renderSalesTable(salesData, today); 
});

// --- புதிய ஃபங்ஷன்: பழைய பில்லை எடிட் செய்ய ---
// --- பழைய பில்லை எடிட் செய்ய (S corrected window name) ---
window.editOldBill = function(saleId, saleData) {
    if(confirm("இந்த பில்லை மாற்றி அமைக்க வேண்டுமா?")) {
        
        // 1. ஸ்டாக்கை பழைய நிலைக்கு கொண்டு வருதல்
        if (saleData.items) {
            saleData.items.forEach(oldItem => {
                Object.keys(cloudProducts).forEach(key => {
                    if (cloudProducts[key].productName === oldItem.name) {
                        let restoredStock = (parseFloat(cloudProducts[key].productStock) || 0) + parseFloat(oldItem.qty);
                        set(ref(db, 'products/' + key + '/productStock'), restoredStock);
                    }
                });
            });
        }

        // 2. விவரங்களை லோடு செய்தல்
        items = saleData.items;
        localStorage.setItem('myBillItems', JSON.stringify(items));
        
        if(document.getElementById("customerName")) document.getElementById("customerName").value = saleData.customerName || "";
        if(document.getElementById("customerMobile")) document.getElementById("customerMobile").value = saleData.customerMobile || "";
        if(document.getElementById("paymentType")) document.getElementById("paymentType").value = saleData.paymentType || "Cash";
        
        // 3. பழைய பில்லை நீக்குதல்
        remove(ref(db, 'dailySales/' + saleId));

        window.openTab('billing-tab');
        window.updateBillTable();
    }
};

// --- 9. DATE FILTER LOGIC ---
window.filterByDate = function() {
    const searchDate = document.getElementById("searchDate").value;
    if (!searchDate) return alert("தேதியைத் தேர்ந்தெடுக்கவும்!");
    
    const formattedDate = new Date(searchDate).toLocaleDateString();
    
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        renderSalesTable(salesData, formattedDate); // குறிப்பிட்ட தேதியை மட்டும் காட்டும்
    }, { onlyOnce: true });
};

window.resetFilter = function() {
    document.getElementById("searchDate").value = "";
    if(document.getElementById("filteredTotal")) document.getElementById("filteredTotal").innerText = "0";
    
    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        renderSalesTable(salesData); // அனைத்தையும் காட்டும்
    }, { onlyOnce: true });
};

// --- 10. DELETE SALE ---
window.deleteSaleItem = function(saleId) {
    let password = prompt("விற்பனையை நீக்க Password உள்ளிடவும்:");
    const SECRET_KEY = "1234"; 

    if (password === SECRET_KEY) {
        if (confirm("நிச்சயமாக இந்த பில்லை மட்டும் நீக்க வேண்டுமா?")) {
            remove(ref(db, 'dailySales/' + saleId)).then(() => alert("நீக்கப்பட்டது!"));
        }
    } else if (password !== null) {
        alert("தவறான பாஸ்வேர்ட்!");
    }
}

// --- 11. POPUP BOX (MODAL) LOGIC ---
window.showSaleDetails = function(items, cName, cMobile) {
    const modal = document.getElementById('salesModal');
    const content = document.getElementById('modalContent');
    
    let html = `
        <div style="background:#f1f8e9; padding:10px; border-radius:5px; margin-bottom:15px; border-left:5px solid #4CAF50;">
            <p style="margin:0; font-weight:bold; color:#2e7d32;">Customer: ${cName || 'Cash Customer'}</p>
            <p style="margin:5px 0 0 0; font-size:13px; color:#666;">Mobile: ${cMobile || 'N/A'}</p>
        </div>
    `;

    html += "<table style='width:100%; border-collapse:collapse; font-family: sans-serif;'>";
    html += "<tr style='background:#f5f5f5; border-bottom:2px solid #ddd;'><th style='text-align:left; padding:8px;'>Item</th><th style='text-align:right; padding:8px;'>Qty</th></tr>";
    
    items.forEach(item => {
        html += `<tr style='border-bottom:1px solid #eee;'>
                    <td style='padding:10px 8px;'>${item.name}</td>
                    <td style='text-align:right; padding:10px 8px;'>${parseFloat(item.qty).toFixed(3)}</td>
                 </tr>`;
    });
    html += "</table>";
    
    content.innerHTML = html;
    modal.style.display = 'flex'; 
};

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
    window.updateLiveTotal();
}

window.deleteProduct = function(key) { if(confirm("Delete product?")) remove(ref(db, 'products/' + key)); 

}

// --- 12. AUTO-FILTER (SELECT செய்தாலே வேலை செய்யும்) ---
window.applyAdvancedFilter = function() {
    const searchDate = document.getElementById("searchDate").value;
    const payType = document.getElementById("filterPaymentType").value;
    
    // தேதி பாக்ஸ் காலியாக இருந்தால் இன்றைய தேதியை எடுக்கும்
    let formattedDate = searchDate ? new Date(searchDate).toLocaleDateString() : new Date().toLocaleDateString();

    onValue(ref(db, 'dailySales'), (snapshot) => {
        const salesData = snapshot.val();
        const reportTableBody = document.querySelector("#salesReportTable tbody");
        if (!reportTableBody) return;

        reportTableBody.innerHTML = "";
        let filteredSum = 0;

        if (salesData) {
            Object.keys(salesData).reverse().forEach(key => {
                const sale = salesData[key];
                const salePayType = sale.paymentType || 'Cash';

                const dateMatch = (sale.date === formattedDate);
                const typeMatch = (payType === "All" || salePayType === payType);

                if (dateMatch && typeMatch) {
                    filteredSum += parseFloat(sale.amount || 0);

                    let row = reportTableBody.insertRow();
                    row.insertCell(0).innerText = `${sale.date} ${sale.time}`;

                    let payColor = (salePayType === "GPay") ? "blue" : (salePayType === "Credit" ? "red" : "green");

                    row.insertCell(1).innerHTML = `
                        <div style="font-weight:bold;">₹${parseFloat(sale.amount).toFixed(2)}</div>
                        <div style="font-size:11px; color:${payColor}; font-weight:bold;">● ${salePayType}</div>
                    `;

                    let actionCell = row.insertCell(2);
                    actionCell.style.display = "flex"; actionCell.style.gap = "10px";
                    actionCell.innerHTML = `
                        <button onclick='window.showSaleDetails(${JSON.stringify(sale.items)}, "${sale.customerName}", "${sale.customerMobile}")' 
                                style="padding:5px 10px; background:#000; color:#fff; border:none; border-radius:3px;">View</button>
                        <button onclick='window.editOldBill("${key}", ${JSON.stringify(sale)})' 
                                style="padding:5px 10px; background:#2196F3; color:#fff; border:none; border-radius:3px;">✏️</button>
                    `;
                }
            });
        }

        // கீழே உள்ள மொத்த தொகையை அப்டேட் செய்தல்
        if (searchDate) {
            if(document.getElementById("filteredTotal")) document.getElementById("filteredTotal").innerText = filteredSum.toFixed(2);
        } else {
            if(document.getElementById("todayTotal")) document.getElementById("todayTotal").innerText = filteredSum.toFixed(2);
        }
    }, { onlyOnce: true });
};