// src/pages/PaymentPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase"; // ton client Firestore (lecture)

// styles
import "./payment.css";

/**
 * Production-ready PaymentPage (Hosted Checkout + polling + Firestore read fallback)
 *
 * REQUIRED backend endpoints:
 *  - POST /api/init-payment
 *    body: { qty, customer_email, customer_name, return_url, meta? }
 *    returns: { transaction_id, payment_url }
 *
 *  - GET /api/payment-status?transaction_id=...
 *    returns: { status: "PENDING"|"ACCEPTED"|"REFUSED"|"CANCELED" }
 *
 *  - GET /api/user-tickets?email=...   (recommended)
 *    returns: { tickets: number, email, updatedAt }
 *
 * Backend notes (server-side): create transaction server-side, call FedaPay API securely,
 * persist transaction (qty, email, bonus...) and implement webhook /api/fedapay-notify to
 * validate & credit tickets in Firestore (admin).
 */

const PRIX_PAR_TICKET = 500; // XOF (affiché seulement — le backend recalculera côté serveur)

export default function PaymentPage() {
  const location = useLocation();
  // Récupération des query params
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);

  // Nombre de tickets choisi (par défaut 1)
  const qty = useMemo(() => Math.max(1, parseInt(params.get("qty") || "1", 10)), [params]);

  // Calcul montant et bonus
  const montantTotal = useMemo(() => qty * PRIX_PAR_TICKET, [qty]);
  const bonusTickets = useMemo(() => Math.floor(qty / 10), [qty]);

  // États pour nom, email et autres
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState(params.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [transactionId, setTransactionId] = useState(null);
  const [userTickets, setUserTickets] = useState(null); // number or null
  const [polling, setPolling] = useState(false);

  // Ref pour savoir si le composant est monté (éviter les memory leaks)
  const mounted = useRef(true);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, []);

const isValidEmail = (e) => !!e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const [isVisible, setIsVisible] = useState(false);
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const status = params.get("status");

  if (status === "canceled") {
    setMessage("Paiement annulé ❌");
    setIsVisible(true);

    // Message visible 2 secondes
    const timer = setTimeout(() => {
      setIsVisible(false); // démarre le fade-out
      setTimeout(() => setMessage(""), 500); // supprime le message après l'animation
    }, 2000); // ← ici on met 2 secondes

    return () => clearTimeout(timer);
  }
}, []);

  // Try to read user tickets from backend API; if fails, fallback to client Firestore read
  const fetchUserTickets = async (emailToFetch) => {
    if (!emailToFetch) return null;
    try {
      // Preferred: backend endpoint to return authoritative ticket count
      const res = await fetch(`https://zenia-tombola-eiz3.onrender.com/api/user-tickets?email=${encodeURIComponent(emailToFetch)}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.tickets === "number") {
          setUserTickets(data.tickets);
          return data.tickets;
        }
      }
    } catch (err) {
      console.warn("user-tickets backend failed:", err);
    }

    // Fallback: try client Firestore read (may be eventual-consistent)
    try {
      if (!db) throw new Error("Firestore client (db) non initialisé");
      const userRef = doc(db, "utilisateurs", emailToFetch);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const tickets = Number(snap.data().tickets || 0);
        setUserTickets(tickets);
        return tickets;
      } else {
        setUserTickets(0);
        return 0;
      }
    } catch (err) {
      console.warn("Fallback Firestore read failed:", err);
      return null;
    }
  };

  // Poll payment status until final or timeout
  const startPollingStatus = (txId) => {
    if (!txId) return;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPolling(true);
    setMessage("Vérification du paiement en cours...");

    const POLL_MS = 3000;
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
    const startAt = Date.now();

    pollIntervalRef.current = setInterval(async () => {
      try {
        // stop if unmounted
        if (!mounted.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPolling(false);
          return;
        }

        // Timeout guard
        if (Date.now() - startAt > TIMEOUT_MS) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
          setPolling(false);
          setLoading(false);
          setMessage("Délai dépassé. Si le paiement a été effectué, il sera appliqué automatiquement sous peu.");
          return;
        }

        const res = await fetch(`https://zenia-tombola-eiz3.onrender.com/api/payment-status?transaction_id=${encodeURIComponent(txId)}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) {
          // keep polling — backend might be temporary down
          console.warn("payment-status non OK:", res.status);
          return;
        }

        const data = await res.json();
        const status = (data?.status || "").toUpperCase();
        console.log("Polled payment status:", status);

        if (!status || status === "PENDING") {
          // still pending
          setMessage("Paiement en attente de confirmation...");
          return;
        }

        // Stop polling for final states
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
        setPolling(false);

        if (status === "ACCEPTED" || status === "APPROVED") {
          setMessage("Paiement confirmé ✓ Récupération des tickets...");
          /* Try to fetch updated tickets from backend (recommended)
          await fetchUserTickets(email); */
          setLoading(false);
          // redirect to tombola page after a short pause
          try {
  const userRef = doc(db, "utilisateurs", email);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const currentTickets = snap.data().tickets || 0;
    await updateDoc(userRef, {
      tickets: currentTickets + qty + bonusTickets
    });
  } else {
    await setDoc(userRef, {
      email,
      tickets: qty + bonusTickets,
      createdAt: new Date()
    })
  }
} catch (err) {
  console.error("Erreur mise à jour Firestore :", err);
}

          setTimeout(() => {
            window.location.href = `/tombola?added=${qty + bonusTickets}&email=${encodeURIComponent(email)}`;
          }, 900);
          return;
        }

        // REFUSED / CANCELED / FAILED
        if (status === "REFUSED" || status === "CANCELED" || status === "FAILED") {
          setLoading(false);
          setMessage(`Paiement ${status.toLowerCase()}.`);
          alert(`Paiement ${status.toLowerCase()}.`);
          return;
        }

        // Unknown final status
        setLoading(false);
        setMessage("Statut de paiement inconnu. Vérifiez votre historique.");
      } catch (err) {
        console.error("Erreur polling payment-status:", err);
        // continue polling
      }
    }, POLL_MS);
  };

  // helper fetch avec timeout
const fetchWithTimeout = async (url, options = {}, timeout = 60000) => { // 60s max
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout réseau")), timeout)
    ),
  ]);
};

const handlePayment = async () => {
  if (!isValidEmail(email)) {
    alert("Veuillez saisir un email valide.");
    return;
  }

  setLoading(true);
  setMessage("Initialisation du paiement...");

  try {
    const body = {
      qty,
      customer_email: email,
      customer_name: nom || undefined,
      return_url: `${window.location.origin}/tombola`,
      meta: { source: "zenia-tombola", page: "payment" },
    };

    // ⚡ fetch avec timeout
    const res = await fetchWithTimeout(
      "https://zenia-tombola-eiz3.onrender.com/api/init-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      60000 // 60 secondes max
    );

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Erreur init-payment (${res.status})`);
    }

    const data = await res.json();
    const txId = data?.transaction_id;
    const paymentUrl = data?.payment_url;

    if (!txId || !paymentUrl) {
      throw new Error("Réponse init-payment invalide (transaction_id/payment_url manquants).");
    }

    setTransactionId(txId);
    setMessage("Redirection vers la page de paiement sécurisée...");

    // Redirection immédiate vers FedaPay
    window.location.assign(paymentUrl);

  } catch (err) {
    console.error("init-payment failed:", err);
    alert("Impossible d'initialiser le paiement : " + (err.message || err));
    setLoading(false);
    setMessage("Échec de l'initialisation du paiement.");
  }
};


  // Allow user to manually refresh tickets (calls backend or Firestore fallback)
  const handleRefreshTickets = async () => {
    setMessage("Récupération des tickets...");
    setLoading(true);
    await fetchUserTickets(email);
    setLoading(false);
    setMessage("Mise à jour terminée.");
  };

  return (

    <div className="payment-page">
      <h1>Paiement — Tombola Royale</h1>

      <div className="card">
        <div className="row">
          <div>Nombre de tickets :</div>
          <div><strong>{qty}</strong></div>
        </div>

        <div className="row">
          <div>Montant total (affiché) :</div>
          <div><strong>{montantTotal} CFA</strong></div>
        </div>

        {bonusTickets > 0 && (
          <div className="row">
            <div>Bonus :</div>
            <div><strong>{bonusTickets} ticket(s) gratuit(s) 🎁</strong></div>
          </div>
        )}

        <div className="form-group" style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Nom"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            disabled={loading}
          />
          <input
            type="email"
            placeholder="Email (obligatoire)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="btn-pay"
            onClick={handlePayment}
            disabled={loading || polling}
            title="Payer maintenant"
            style={{ flex: 1 }}
          >
            {loading ? "Initialisation..." : "💳 Payer maintenant"}
          </button>

          <button
            className="btn-secondary"
            onClick={handleRefreshTickets}
            disabled={!email || loading}
            title="Rafraîchir les tickets"
            style={{ padding: "10px 12px" }}
          >
            Rafraîchir
          </button>
        </div>


        <div className="info" style={{ marginTop: 10 }}>
          <small>{message}</small>
          {userTickets !== null && (
            <div style={{ marginTop: 8 }}>
              <strong>Vos tickets :</strong> {userTickets} (après confirmation du paiement)
            </div>
          )}
          {!userTickets && <small style={{ color: "#666", display: "block", marginTop: 8 }}>Entrez votre email puis cliquez sur "Rafraîchir" pour voir vos tickets.</small>}
        </div>

        <div className="notes" style={{ marginTop: 12 }}>
          <p style={{ margin: 0 }}>
           Conseil : Nous vous recommandons d’acheter au moins 10 tickets afin de bénéficier d’un bonus d’un ticket offert.
          </p>
        </div>
       {message && (
  <div className={`overlay ${!isVisible ? "hide" : ""}`}>
    <div className="overlay-content">{message}</div>
  </div>
)}

      </div>
    </div>
  );
}
