// src/pages/Cash.jsx
import React, { useEffect, useState } from "react";
import "./cash.css";
import { useSearchParams,  useNavigate  } from "react-router-dom";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function Cash() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prizeId = searchParams.get("id");
  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchPrize = async () => {
      if (!prizeId) return;
      try {
        const docRef = doc(db, "prix", prizeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setPrize(docSnap.data());
        } else {
          console.log("Lot non trouvé");
        }
      } catch (e) {
        console.error("Erreur lors de la récupération du lot :", e);
      } finally {
        setLoading(false);
      }
    };
    fetchPrize();
  }, [prizeId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "Argents"), {
        prizeId,
        prizeLabel: prize.label,
        ...form,
        createdAt: new Date(),
      });
      setSubmitted(true); // ⚡️ déclenche l’affichage de la carte
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du formulaire :", err);
      alert("Erreur : formulaire non envoyé");
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (!prize) return <p>Lot introuvable.</p>;

  return (
    <div className="cash-page">
      <h1>💰 Recevoir votre argent</h1>
      <p>Vous avez gagné : <strong>{prize.label}</strong></p>

      {!submitted && (
        <form onSubmit={handleSubmit} className="cash-form">
          <input
            type="text"
            name="nom"
            placeholder="Nom complet"
            value={form.nom}
            onChange={handleChange}
            required
          />
          <input
            type="tel"
            name="telephone"
            placeholder="Téléphone"
            value={form.telephone}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <button type="submit">Envoyer</button>
        </form>
      )}

      {submitted && (
        <div className="cash-success">
          <div className="cash-card">
            <h2>🎉 Félicitations !</h2>
            <p>
              Nous avons bien reçu votre formulaire pour <strong>{prize.label}</strong>.<br />
              Nous préparons votre transfert. D'ici 24h vous recevrez votre argent, mais si vous ne le recevez pas sous 24h, veuillez nous contacter sur <a href="https://web.facebook.com/profile.php?id=61576738621166" className="link">Facebook</a>
            </p>
            <button onClick={() => navigate("/tombola")}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
