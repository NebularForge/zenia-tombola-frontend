import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./landing.css";
import logo from "../assets/logo.png"; // Ton logo Zenia Tombola

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/tombola");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  const handleEnterNow = () => {
    navigate("/tombola");
  };

  return (
    <div className="landing-container">
      <div className="particles"></div>

      <div className="landing-content">
        <img src={logo} alt="Zenia Tombola Logo" className="landing-logo" />

        <h1 className="landing-title">Zenia Tombola</h1>
        <p className="landing-subtitle">
          Participez et gagnez des lots incroyables en quelques clics !
        </p>

        <button className="enter-btn" onClick={handleEnterNow}>
          Entrer maintenant
        </button>
      </div>
    </div>
  );
}
