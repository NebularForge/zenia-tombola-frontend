import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import './PaymentResult.css';

const PaymentResult = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("status"); // ex: "success" ou "failed"
    setStatus(paymentStatus);

    const interval = setInterval(() => {
      setRedirectCountdown(prev => prev - 1);
    }, 1000);

    const timeout = setTimeout(() => {
      if (paymentStatus === "success") {
        navigate("/tombola");
      } else {
        navigate("/payment");
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate]);

  return (
   <div className="payment-result-container">
  <div className={`card ${status === "success" ? "success" : "failed"}`}>
    {status === "success" ? (
      <>
        <h1>✅ Paiement Réussi !</h1>
        <p>
          Merci pour votre paiement. Vous serez redirigé vers la page Tombola dans{" "}
          <span>{redirectCountdown}</span> secondes.
        </p>
      </>
    ) : (
      <>
        <h1>❌ Paiement Échoué !</h1>
        <p>
          Une erreur est survenue. Vous serez redirigé vers la page de paiement dans{" "}
          <span>{redirectCountdown}</span> secondes.
        </p>
      </>
    )}
    <div className="progress-bar">
      <div className="progress-bar-inner"></div>
    </div>
  </div>
</div>
  );
};

export default PaymentResult;
