import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { ref, onValue, push } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";


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
// கிளவுடில் இருந்து இன்றைய மொத்த விற்பனையை மட்டும் எடுத்து காட்டுதல்


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
    let finalTotal = parseFloat(document.getElementById("totalAmount").innerText);
    
    // பில் காலியாக இருந்தால் பிரிண்ட் செய்ய வேண்டாம்
    if (finalTotal === 0 || items.length === 0) {
        alert("பில் காலியாக உள்ளது! பொருட்களைச் சேர்க்கவும்.");
        return;
    }

    // --- 1. கிளவுடில் விற்பனை விவரங்களைச் சேமித்தல் ---
    try {
        const salesRef = ref(db, 'dailySales');
        push(salesRef, {
            amount: finalTotal,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            items: items 
        });
    } catch (error) {
        console.error("Sales not saved:", error);
    }

    // --- 2. பிரிண்ட் செய்யும் விண்டோ ---
    let printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write('<html><head><title>Bill Print</title>');
    printWindow.document.write(`
        <style>
            body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 10px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; }
            .store-name { font-size: 22px; font-weight: bold; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { border-bottom: 1px dashed #000; text-align: left; }
            .total-section { border-top: 2px dashed #000; margin-top: 10px; padding-top: 10px; text-align: right; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; }
        </style>
    `);
    printWindow.document.write('</head><body>');

    printWindow.document.write(`
        <div class="header">
            <p class="store-name">AYYAPPAN STORE</p>
            <p>No:135, P.H. ROAD, MADURAVOYAL</p>
            <p>Mobile: 9943514861</p>
            <p style="font-size: 11px;">Date: ${new Date().toLocaleString()}</p>
        </div>
    `);

    printWindow.document.write('<table><thead><tr><th>Item</th><th>Qty</th><th>Total</th></tr></thead><tbody>');
    items.forEach(item => {
        printWindow.document.write(`<tr><td>${item.name}</td><td>${item.qty}</td><td>${item.total}</td></tr>`);
    });
    printWindow.document.write('</tbody></table>');

    printWindow.document.write(`<div class="total-section">Grand Total: ₹${finalTotal}</div>`);
    printWindow.document.write('<div class="footer"><p>Thank you! Visit Again!</p></div>');
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();

    // --- 3. பிரிண்ட் மற்றும் ஆட்டோ-கிளியர் ---
    setTimeout(() => {
        printWindow.print();
        printWindow.close(); 
        
        // பிரிண்ட் கொடுத்த உடனே பில்லை கிளியர் செய்யும் பங்க்ஷன்
        window.clearBill(); 
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
        let editBtn = document.createElement("button");
        editBtn.innerHTML = "✏️";
        editBtn.style.cssText = "background:none; border:none; color:blue; cursor:pointer; font-size:18px; margin-right:5px;";
        editBtn.onclick = function() {
            editItem(index);
        };
        actionCell.appendChild(editBtn);
        
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

// இன்றைய விற்பனையைக் கணக்கிடும் பகுதி
onValue(ref(db, 'dailySales'), (snapshot) => {
    const salesData = snapshot.val();
    let todaySum = 0;
    const today = new Date().toLocaleDateString();

    if (salesData) {
        Object.keys(salesData).forEach(key => {
            if (salesData[key].date === today) {
                todaySum += parseFloat(salesData[key].amount || 0);
            }
        });
    }
    // ஸ்கிரீனில் தொகையை அப்டேட் செய்தல்
    const todayTotalElement = document.getElementById("todayTotal");
    if(todayTotalElement) {
        todayTotalElement.innerText = todaySum;
    }
});