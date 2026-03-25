import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// script.js - Pure JavaScript only

const firebaseConfig = {
    apiKey: "AIzaSyDFsF9Ptip38ixPNSXDM8SpaTB7Rf4RH-M",
    authDomain: "h-pos-app.firebaseapp.com",
    databaseURL: "https://h-pos-app-default-rtdb.firebaseio.com",
    projectId: "h-pos-app",
    storageBucket: "h-pos-app.firebasestorage.app",
    messagingSenderId: "417866928315",
    appId: "1:417866928315:web:5864124e68e43e36ded99e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// Screen Switcher (Login <-> Signup)
function toggleAuth() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('signup-form').classList.toggle('hidden');
}

// SIGNUP LOGIC
async function handleSignup() {
    const shop = document.getElementById('reg-shop').value;
    const mobile = document.getElementById('reg-mobile').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;

    if(!email || !pass || !shop) return alert("Ellaa details-um fill pannunga!");

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
        const uid = userCredential.user.uid;

        // 2 Days Trial Calculation
        let exp = new Date();
        exp.setDate(exp.getDate() + 2); 

        await db.ref('users/' + uid).set({
            shopName: shop,
            mobile: mobile,
            expiryDate: exp.toISOString(),
            status: 'active'
        });

        alert("Registration Success! Ippo Login Pannunga.");
        toggleAuth();
    } catch (e) { 
        alert("Error: " + e.message); 
    }
}

// LOGIN LOGIC
async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;

    if(!email || !pass) return alert("Email & Password kudunga!");

    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, pass);
        const uid = userCredential.user.uid;

        db.ref('users/' + uid).once('value').then((snap) => {
            const data = snap.val();
            const today = new Date();
            const expiry = new Date(data.expiryDate);

            if (today > expiry) {
                alert("Account Expired! Admin-a contact pannunga.");
                auth.signOut();
            } else {
                // UI updates with User Data
                document.getElementById('displayShopName').innerText = data.shopName;
                document.getElementById('drawerShopName').innerText = data.shopName;
                document.getElementById('drawerMobile').innerText = data.mobile;
                document.getElementById('drawerExpiry').innerText = expiry.toLocaleDateString('en-IN');
                
                // Switch to Main App
                document.getElementById('auth-sec').classList.add('hidden');
                document.getElementById('main-app').classList.remove('hidden');
                alert("Welcome, " + data.shopName);
            }
        });
    } catch (e) { 
        alert("Login failed! Check your email/password."); 
    }
}

// Sidebar & Section functions (Unga existing HTML logic)
function toggleDrawer() {
    document.getElementById('drawer').classList.toggle('active');
    document.getElementById('overlay').classList.toggle('active');
}

function openSection(id) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-sec'));
    document.getElementById(id).classList.add('active-sec');
    toggleDrawer();
}

function logout() {
    if(confirm("நிச்சயமாக வெளியேற வேண்டுமா?")) {
        auth.signOut().then(() => {
            // Firebase logout aanathum, main-app-ai hide panni page-ai refresh pannuvom
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('auth-sec').classList.remove('hidden');
            location.reload(); 
        });
    }
}