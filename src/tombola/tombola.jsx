import React, { useRef, useState, useEffect } from "react";
import { doc, getDoc, updateDoc, addDoc, collection, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import applauseSound from "../sounds/applause.mp3";
import "./tombola.css";
import nintendo from "../assets/nintendo.png";
import pc from "../assets/pc.png";
import samsung from "../assets/samsung.png";
import confetti from "canvas-confetti";

// ======================= Définition des segments =======================
const SEGMENTS = [
{ id: 0, label: "Ordinateur portable HP Elitebook core i5 Tactile", type: "image", img: pc, chance: 1.5 },
{ id: 1, label: "Nintendo switch 2", type: "image", img: nintendo, chance: 2 },
{ id: 2, label: "Perdu", type: "text", chance: 17.167 },
{ id: 3, label: "Samsung A16", type: "image", img: samsung, chance: 3 },
{ id: 4, label: "1000 CFA", type: "text", chance: 15 },
{ id: 5, label: "2000 CFA", type: "text", chance: 12 },
{ id: 6, label: "Perdu", type: "text", chance: 17.167 },
{ id: 7, label: "3000 CFA", type: "text", chance: 10 },
{ id: 8, label: "5000 CFA", type: "text", chance: 8 },
{ id: 9, label: "Perdu", type: "text", chance: 17.167 },

];

const MIN_FULL_ROTATIONS = 6;

// ======================= Composant Tombola =======================
export default function TombolaWheel() {
  const wheelRef = useRef(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [tickets, setTickets] = useState(0);          // nombre de tickets disponibles
  const [showOverlay, setShowOverlay] = useState(false);
const [showWelcome, setShowWelcome] = useState(false); // <-- ajouté pour le welcome
const [ticketCount, setTicketCount] = useState(1);
const [userEmail, setUserEmail] = useState("");
const applause = new Audio(applauseSound);
applause.volume = 0.8; // Volume entre 0.0 et 1.0


useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email");
  const addedTickets = parseInt(params.get("added")) || 0;

  if (!email) return;

  setUserEmail(email);

  const checkFirstVisit = async () => {
      try {
        const userRef = doc(db, "utilisateurs", email);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists() || !userSnap.data().hasVisitedTombola) {
          setShowWelcome(true);
          // On mettra à jour Firestore pour dire qu'il est venu
          if (userSnap.exists()) {
            await updateDoc(userRef, { hasVisitedTombola: true });
          } else {
            await setDoc(userRef, { email, tickets: addedTickets, hasVisitedTombola: true, createdAt: new Date() });
          }
        }
      } catch (err) {
        console.error("Erreur checkFirstVisit:", err);
      }
    };

    checkFirstVisit();

  const fetchTickets = async () => {
    const userRef = doc(db, "utilisateurs", email);
    const userSnap = await getDoc(userRef);
    let currentTickets = 0;
    if (userSnap.exists()) {
      currentTickets = userSnap.data().tickets || 0;
    }
    setTickets(currentTickets);
  };

  fetchTickets();
}, []);

  const segCount = SEGMENTS.length;
  const anglePerSeg = 360 / segCount;

  // ======================= Sélection pondérée =======================
  const weightedPickIndex = () => {
    const total = SEGMENTS.reduce((s, seg) => s + seg.chance, 0);
    let r = Math.random() * total;
    for (let i = 0; i < SEGMENTS.length; i++) {
      if (r < SEGMENTS[i].chance) return i;
      r -= SEGMENTS[i].chance;
    }
    return SEGMENTS.length - 1;
  };

  // ======================= Fonction spin =======================
  const spin = async () => {
    if (spinning) return;
    setResult(null);
    setSpinning(true);

    const winningIndex = weightedPickIndex();
    const segCenterAngle = winningIndex * anglePerSeg + anglePerSeg / 2;
    const POINTER_ANGLE = 270;
    const randomExtra = Math.random() * (anglePerSeg / 3);
    const finalRotation = MIN_FULL_ROTATIONS * 360 + (POINTER_ANGLE - segCenterAngle) + randomExtra;

    const wheel = wheelRef.current;
    if (!wheel) return;

    wheel.style.transition = "transform 5s cubic-bezier(0.18, 0.89, 0.32, 1)";
    wheel.style.transform = `rotate(${finalRotation}deg)`;

    


    setTimeout(async () => {
      // Reset rotation pour animations futures
      wheel.style.transition = "none";
      const normalized = finalRotation % 360;
      wheel.style.transform = `rotate(${normalized}deg)`;
      void wheel.offsetHeight; // forcer reflow
      setTimeout(() => { wheel.style.transition = ""; }, 20);

      // Afficher le résultat visuel
      const segElements = document.querySelectorAll(".tw-segment-label");
      segElements[winningIndex]?.classList.add("tw-segment-win");

      setSpinning(false);
      setResult(SEGMENTS[winningIndex]);

if (SEGMENTS[winningIndex].label !== "Perdu") {
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    applause.play().catch(err => console.error("Erreur lecture audio :", err));
}
    
   if (tickets <= 0) {
  alert("Plus de tickets !");
  return;
}

if (userEmail) {
  try {
    const userRef = doc(db, "utilisateurs", userEmail);
    const snap = await getDoc(userRef);
    if (!snap.exists() || (snap.data().tickets || 0) <= 0) {
      alert("Plus de tickets disponibles !");
      return;
    }

    const newTickets = (snap.data().tickets || 0) - 1;
    await updateDoc(userRef, { tickets: newTickets });
    setTickets(newTickets);
  } catch (err) {
    console.error("Erreur Firestore :", err);
  }
}


      setTimeout(async () => {
        segElements[winningIndex]?.classList.remove("tw-segment-win");
      }, 3000);

    }, 5200);
  };

  const resetResult = () => setResult(null);

  // ======================= JSX =======================
  return (
    <div className="tw-page" role="main">
      {/* ----- Header ----- */}
      <div className="tw-header">

      {/* ----- Overlay Bienvenue ----- */}
{showWelcome && (
  <div className="overlay welcome-overlay">
    <div className="overlay-panel welcome-panel">
      <h2>🎉 Bienvenue dans la Tombola Royale ! de Zenia</h2>
      <p>Nous sommes ravis de vous voir ! Achetez vos tickets à 500CFA seulement et tentez de gagner des lots incroyables.</p>
      <button
        className="tw-btn tw-validate"
        onClick={() => setShowWelcome(false)}
      >
        Commencer à jouer
      </button>
    </div>
  </div>
)}


        <div className="ticket-counter">
        🎟 Tickets : {tickets}
      </div>
        <h1>🎡 Tombola Royale — Zenia</h1>
        <p className="tw-sub">
          Clique sur <strong>Tourner</strong> pour tenter ta chance pour gagner des lots incroyables.
        </p>
      </div>

      {/* ----- Roue ----- */}
      <div className="tw-center">
        <div className="tw-wheel-wrap" aria-label="Roue de la tombola">
          <div className="tw-pointer tw-pointer-down" aria-hidden="true">
            <div className="tw-pointer-tip" />
          </div>

          <div className="tw-wheel" ref={wheelRef} aria-live="polite" aria-atomic="true">
            {/* Fond de la roue */}
            <div
              className="tw-wheel-face"
              style={{
                background: `conic-gradient(
                  #c68b00 0deg 36deg,
                  #a64f00 36deg 72deg,
                  #c68b00 72deg 108deg,
                  #a64f00 108deg 144deg,
                  #c68b00 144deg 180deg,
                  #a64f00 180deg 216deg,
                  #c68b00 216deg 252deg,
                  #a64f00 252deg 288deg,
                  #c68b00 288deg 324deg,
                  #a64f00 324deg 360deg
                )`,
              }}
            />

            {/* Segments */}
            {SEGMENTS.map((seg, i) => {
              const rotate = i * anglePerSeg;
              return (
                <div
                  className="tw-segment-label"
                  key={seg.id}
                  style={{ transform: `rotate(${rotate}deg)` }}
                >
                  <div
                    className="tw-segment-content"
                    style={{ transform: `rotate(${anglePerSeg / 2}deg) translateY(-50%)` }}
                  >
                    {seg.type === "image" ? (
                      <img src={seg.img} alt={seg.label} className="seg-img" />
                    ) : (
                      <span className="seg-text">{seg.label}</span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Centre de la roue */}
            <div className="tw-center-cap">
              <div className="tw-cap-inner" />
            </div>
          </div>
        </div>
      </div>

      {/* ----- Contrôles ----- */}
      <div className="tw-controls">
      <button
  className={`tw-btn tw-spin ${spinning ? "disabled" : ""}`}
  onClick={spin}
  disabled={spinning || tickets === 0}
  aria-disabled={spinning || tickets === 0}
>
  {tickets === 0
    ? "Achetez un ticket pour jouer !"
    : spinning
    ? "En cours..."
    : "🎯 Tourner la roue"}
</button>


        <button className="tw-btn tw-buy" onClick={() => setShowOverlay(true)}>
  🎟 Acheter des tickets
</button>

      </div>
{/* ----- Overlay Achat Tickets ----- */}
{showOverlay && (
  <div className="overlay">
    <div className="overlay-panel">
      <h2>Combien de tickets voulez-vous acheter ?</h2>

      <p className="ticket-count">{ticketCount}</p>

      <input
        type="range"
        min="1"
        max="100"
        value={ticketCount}
        onChange={(e) => setTicketCount(Number(e.target.value))}
      />

      <button
        className="tw-btn tw-validate"
        onClick={() => {
          // Redirige vers PaymentPage avec uniquement qty
          window.location.href = `/payment?qty=${ticketCount}`;
        }}
      >
        Valider
      </button>

      <button
        className="tw-btn tw-cancel"
        onClick={() => setShowOverlay(false)}
      >
        Annuler
      </button>
    </div>
  </div>
)}

      {/* ----- Résultat ----- */}
      {result && (
        <div className="tw-result-overlay" role="alert" aria-live="assertive">
          <div className="tw-result-card">
            <h2>{result.label === "Perdu" ? "😢 Dommage..." : "🎉 Félicitations !"}</h2>

            {result.type === "image" ? (
              <img src={result.img} alt={result.label} className="tw-result-img" />
            ) : (
              <div className="tw-result-prize">{result.label}</div>
            )}

            <p className="tw-result-text">
              {result.label === "Perdu"
                ? "Ce coup-ci ce n'était pas ton jour. Retente ta chance !"
                : result.type === "image"
                ? `Tu as gagné : ${result.label}. Remplis le formulaire de livraison pour être livré.`
                : `Vous avez gagné ${result.label} ! Cliquez ci-dessous pour recevoir votre gain.`}
            </p>

            <div className="tw-result-actions">
              {result.label === "Perdu" ? (
                <>
                  <button className="tw-btn" onClick={resetResult}>Fermer</button>
                  <button
                    className="tw-btn tw-play-again"
                    onClick={() => {
                      resetResult();
                      setTimeout(() => spin(), 300);
                    }}
                  >
                    Rejouer
                  </button>
                </>
              ) : result.type === "image" ? (
                <button
                  className="tw-btn tw-delivery"
                  onClick={async () => {
                    try {
                      const docRef = await addDoc(collection(db, "prix"), {
                        label: result.label,
                        type: result.type,
                        img: result.img,
                        createdAt: new Date(),
                      });
                      window.location.href = `/delivery?id=${docRef.id}`;
                    } catch (e) {
                      console.error("Erreur lors de l'enregistrement du lot :", e);
                      alert("Erreur : impossible d'enregistrer le lot.");
                    }
                  }}
                >
                  📦 Formulaire de livraison
                </button>
              ) : (
                <button
  className="tw-btn tw-cash"
  onClick={async () => {
    try {
      // Ajouter le lot texte dans Firestore
      const docRef = await addDoc(collection(db, "prix"), {
        label: result.label,
        type: result.type,
        img: result.type === "image" ? result.img : null,
        createdAt: new Date(),
      });

      // Rediriger vers Cash avec l'ID du lot
      window.location.href = `/cash?id=${docRef.id}`;
    } catch (e) {
      console.error("Erreur lors de l'enregistrement du lot :", e);
      alert("Erreur : impossible d'enregistrer le lot.");
    }
  }}
>
  💰 Recevoir mon argent
</button>

              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
