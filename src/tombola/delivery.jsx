import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import confetti from "canvas-confetti";
import "./delivery.css";

export default function Livraison() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const prizeId = searchParams.get("id");

  const [prize, setPrize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
  });
  const [submitted, setSubmitted] = useState(false);

  // Récupération du lot depuis Firestore
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

  // Gestion des champs du formulaire
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Gestion de l'envoi du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "livraisons"), {
        prizeId,
        prizeLabel: prize.label,
        ...form,
        creeLe: new Date(),
      });

      // Feu d'artifice
confetti({
  particleCount: 200,
  angle: 60,
  spread: 120,
  origin: { x: 0.5, y: 0.6 },
  colors: ['#ffb400', '#6a5dfc', '#ff5e5e']
});

      setSubmitted(true);
    } catch (err) {
      console.error("Erreur lors de l'enregistrement du formulaire :", err);
      alert("Erreur : formulaire non envoyé");
    }
  };

  if (loading) return <p>Chargement...</p>;
  if (!prize) return <p>Lot introuvable.</p>;

  return (
    <div className="delivery-page">
      {!submitted ? (
        <>
          <h1>Formulaire de Livraison</h1>
          <p>
            Vous avez gagné : <strong>{prize.label}</strong>
          </p>
          {prize.type === "image" && (
            <img src={prize.img} alt={prize.label} width="200" />
          )}

          <form onSubmit={handleSubmit} className="delivery-form">
            <input
              type="text"
              name="nom"
              placeholder="Nom complet"
              value={form.nom}
              onChange={handleChange}
              required
            />
            <input
              type="text"
              name="adresse"
              placeholder="Adresse complète"
              value={form.adresse}
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
        </>
      ) : (
        <div className="delivery-success">
          <div className="success-card">
            <h2>🎉 Félicitations !</h2>
            <p>
              Nous avons bien reçu votre formulaire pour <strong>{prize.label}</strong>.<br />
              Nous préparons votre livraison. Si vous ne la recevez pas sous 24h, veuillez nous contacter sur <a href="https://web.facebook.com/profile.php?id=61576738621166" className="link">Facebook</a>.
            </p>
            <button onClick={() => navigate("/tombola")}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
