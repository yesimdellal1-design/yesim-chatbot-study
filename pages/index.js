import React, { useEffect, useMemo, useState } from "react";

const TURN_LIMIT = 5;

function randCondition() {
  return Math.random() < 0.5 ? "informational" : "empathic";
}

export default function Home() {
  const [sessionId, setSessionId] = useState("");
  const [condition, setCondition] = useState("");

  const [phase, setPhase] = useState("pre"); // pre -> template -> chat -> post -> done
  const [
