let total = 0;
let items = JSON.parse(localStorage.getItem('myBillItems')) || [];

// பக்கத்தை திறக்கும்போது பழைய பில்லைக் காட்டுதல்
window.onload = function() {
    items.forEach(item => displayItem(item.name, item.price));
    updateTotal();
};

function addItem() {
    let name = document.getElementById("itemName").value;
    let price = parseFloat(document.getElementById("itemPrice").value);

    if (name && price) {
        let item = { name: name, price: price };
        items.push(item);
        localStorage.setItem('myBillItems', JSON.stringify(items));
        
        displayItem(name, price);
        updateTotal();

        document.getElementById("itemName").value = "";
        document.getElementById("itemPrice").value = "";
    } else {
        alert("தயவுசெய்து விபரங்களை நிரப்பவும்!");
    }
}

function displayItem(name, price) {
    let table = document.getElementById("billTable").getElementsByTagName('tbody')[0];
    let row = table.insertRow();
    row.insertCell(0).innerHTML = name;
    row.insertCell(1).innerHTML = "₹" + price;
}

function updateTotal() {
    total = items.reduce((sum, item) => sum + item.price, 0);
    document.getElementById("totalAmount").innerText = total;
}

function generateBill() {
    window.print();
}

// பில்லை முழுவதுமாக அழிக்க (புதிய பில் ஆரம்பிக்க)
function clearBill() {
    localStorage.removeItem('myBillItems');
    items = [];
    location.reload();
}