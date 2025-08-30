import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./landing.css";

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirige vers "/tombola" après 3 secondes
    const timer = setTimeout(() => {
      navigate("/tombola");
    }, 3000);

    // Nettoyage du timer si le composant est démonté avant
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="landing-container">
      <h1 className="landing-title">Zenia Tombola</h1>
    </div>
  );
}
