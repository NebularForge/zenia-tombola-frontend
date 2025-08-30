import React from "react";
import { Routes, Route } from "react-router-dom";
import Tombola from "./tombola/tombola";
import Delivery from "./tombola/delivery";
import Cash from "./tombola/cash";
import PaymentPage from "./tombola/payment";
import LandingPage from "./tombola/landing";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/tombola" element={<Tombola />} />
      <Route path="/delivery" element={<Delivery />} />
      <Route path="/cash" element={<Cash />} />
      <Route path="/payment" element={<PaymentPage />} />
    </Routes>
  );
}

export default App;
