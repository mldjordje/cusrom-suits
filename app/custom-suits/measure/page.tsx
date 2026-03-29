"use client";
import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Slider, Switch, TextField, FormControlLabel } from "@mui/material";
import { m } from "framer-motion";
import { suits, fabrics as fallbackFabrics } from "../data/options";
import { useFabrics } from "../hooks/useFabrics";
import { computePrice } from "../utils/price";
import { SuitState } from "../hooks/useSuitConfigurator";
import { buildBackendUrl } from "../utils/backend";

type Reco = {
  size: string;
  chest: number;
  waist: number;
  hips: number;
  sleeve: number;
  inseam: number;
  shoulder: number;
};

type MeasurementValues = Omit<Reco, "size">;

type MetricSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint: string;
};

type MeasureFieldProps = {
  label: string;
  value: number;
  recommended: number;
  unit: string;
  onChange: (value: number) => void;
};

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const sliderSx = {
  color: "#1a1716",
  height: 6,
  "& .MuiSlider-rail": {
    opacity: 0.22,
  },
  "& .MuiSlider-thumb": {
    width: 18,
    height: 18,
    border: "2px solid #1a1716",
    backgroundColor: "#f7f1eb",
  },
};

const textFieldSx = {
  "& .MuiInputBase-root": {
    fontFamily: "var(--font-sans)",
    borderRadius: "14px",
    backgroundColor: "#fbf9f7",
  },
  "& .MuiInputBase-input": {
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    padding: "10px 12px",
  },
  "& fieldset": {
    borderColor: "#e6dbd3",
  },
  "&:hover fieldset": {
    borderColor: "#c7b8b0",
  },
  "& .Mui-focused fieldset": {
    borderColor: "#1a1716",
  },
};

const MetricSlider = ({ label, value, onChange, min, max, step, unit, hint }: MetricSliderProps) => {
  return (
    <div className="rounded-[26px] border border-[#eadfd8] bg-white/90 p-4 shadow-[0_16px_60px_rgba(20,15,12,0.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f645d]">{label}</p>
          <p className="text-2xl font-semibold text-[#1a1716]">
            {value} <span className="text-sm font-normal text-[#7b6f67]">{unit}</span>
          </p>
        </div>
        <TextField
          type="number"
          value={value}
          size="small"
          onChange={(event) => {
            if (event.target.value === "") return;
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(clampNumber(next, min, max));
          }}
          inputProps={{ min, max, step }}
          sx={textFieldSx}
        />
      </div>
      <div className="mt-4">
        <Slider
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(_, next) => onChange(next as number)}
          sx={sliderSx}
        />
      </div>
      <p className="mt-2 text-xs text-[#8a7e76]">{hint}</p>
    </div>
  );
};

const MeasureField = ({ label, value, recommended, unit, onChange }: MeasureFieldProps) => {
  const diff = Math.abs(value - recommended);
  const diffTone = diff > 3 ? "text-amber-600" : "text-emerald-700";

  return (
    <div
      className={`rounded-2xl border bg-white/95 p-4 shadow-[0_14px_40px_rgba(20,15,12,0.06)] ${
        diff > 3 ? "border-amber-200" : "border-[#eadfd8]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6f645d]">{label}</p>
          <p className="mt-1 text-xl font-semibold text-[#1a1716]">
            {value} <span className="text-sm font-normal text-[#7b6f67]">{unit}</span>
          </p>
          <p className={`mt-1 text-xs ${diffTone}`}>
            Preporuka: {recommended} {unit}
          </p>
        </div>
        <TextField
          type="number"
          value={value}
          size="small"
          onChange={(event) => {
            if (event.target.value === "") return;
            const next = Number(event.target.value);
            if (!Number.isFinite(next)) return;
            onChange(next);
          }}
          sx={textFieldSx}
        />
      </div>
    </div>
  );
};

function MeasurePageContent() {
  const [h, setH] = useState(182);
  const [w, setW] = useState(80);
  const [age, setAge] = useState(30);
  const [autoFill, setAutoFill] = useState(true);
  const [values, setValues] = useState<MeasurementValues>({
    chest: 98,
    waist: 84,
    hips: 100,
    sleeve: 62,
    inseam: 84,
    shoulder: 46,
  });
  const [ime, setIme] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [napomena, setNapomena] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "draft">("idle");
  const searchParams = useSearchParams();
  const configParam = searchParams.get("config");
  const parsedConfig: SuitState | null = useMemo(() => {
    if (!configParam) return null;
    try {
      return JSON.parse(configParam) as SuitState;
    } catch (err) {
      console.warn("Config parse failed", err);
      return null;
    }
  }, [configParam]);

  const { fabrics } = useFabrics();
  const fabricList = fabrics.length ? fabrics : fallbackFabrics;

  const reco: Reco | null = useMemo(() => {
    const height = clampNumber(h, 150, 210);
    const weight = clampNumber(w, 45, 140);
    const ageValue = clampNumber(age, 16, 80);
    const bmi = weight / Math.pow(height / 100, 2);
    const ageShift = clampNumber((ageValue - 30) * 0.08, -2, 4);

    let size = "M";
    if (bmi < 21) size = "S";
    else if (bmi > 27) size = "L";
    if (bmi > 31) size = "XL";

    const clampReco = (value: number, min: number, max: number) =>
      Math.round(clampNumber(value, min, max));

    return {
      size,
      chest: clampReco(0.52 * height + (bmi - 23) * 1.2 + ageShift, 86, 132),
      waist: clampReco(0.45 * height + (bmi - 23) * 1.5 + ageShift * 0.9, 72, 122),
      hips: clampReco(0.48 * height + (bmi - 23) * 1.1 + ageShift * 0.7, 86, 132),
      sleeve: clampReco(0.4 * height + 2, 56, 73),
      inseam: clampReco(0.47 * height, 70, 92),
      shoulder: clampReco(0.23 * height + 6, 40, 55),
    };
  }, [age, h, w]);

  useEffect(() => {
    if (!reco || !autoFill) return;
    setValues({
      chest: reco.chest,
      waist: reco.waist,
      hips: reco.hips,
      sleeve: reco.sleeve,
      inseam: reco.inseam,
      shoulder: reco.shoulder,
    });
  }, [autoFill, reco]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("suitMeasureDraft");
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (typeof draft.h === "number") setH(draft.h);
      if (typeof draft.w === "number") setW(draft.w);
      if (typeof draft.age === "number") setAge(draft.age);
      if (typeof draft.autoFill === "boolean") setAutoFill(draft.autoFill);
      if (draft.values) setValues(draft.values);
      if (typeof draft.ime === "string") setIme(draft.ime);
      if (typeof draft.email === "string") setEmail(draft.email);
      if (typeof draft.telefon === "string") setTelefon(draft.telefon);
      if (typeof draft.napomena === "string") setNapomena(draft.napomena);
      setStatus("draft");
    } catch (err) {
      console.warn("Draft load failed", err);
    }
  }, []);

  const summary = useMemo(() => {
    if (!parsedConfig) return null;
    const suit = suits.find((s) => s.id === parsedConfig.styleId);
    const fabric = fabricList.find((f: any) => String(f.id) === String(parsedConfig.colorId));
    const lapel = suit?.lapels?.find((l) => l.id === parsedConfig.lapelId) || suit?.lapels?.[0];
    const lapelWidth = lapel?.widths?.find((w) => w.id === parsedConfig.lapelWidthId) || lapel?.widths?.[0];
    const pocket = suit?.pockets?.find((p) => p.id === parsedConfig.pocketId);
    const breastPocket = suit?.breastPocket?.find((p) => p.id === parsedConfig.breastPocketId);
    const interior = suit?.interiors?.find((i) => i.id === parsedConfig.interiorId);
    const cuff = suit?.cuffs?.find((c) => c.id === parsedConfig.cuffId);
    return {
      suitName: suit?.name || "Model nije izabran",
      fabricName: fabric?.name || "Tkanina nije izabrana",
      lapel: lapel?.name,
      lapelWidth: lapelWidth?.name,
      pocket: pocket?.name,
      breastPocket: breastPocket?.name,
      interior: interior?.name,
      cuff: cuff?.name,
    };
  }, [fabricList, parsedConfig]);

  const price = useMemo(() => {
    if (!parsedConfig) return null;
    return computePrice(parsedConfig, suits).total;
  }, [parsedConfig]);

  const emailValid =
    email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const phoneDigits = telefon.replace(/\D/g, "");
  const phoneValid = telefon.trim().length === 0 || phoneDigits.length >= 8;

  const saveDraft = () => {
    try {
      const payload = {
        h,
        w,
        age,
        autoFill,
        values,
        ime,
        email,
        telefon,
        napomena,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem("suitMeasureDraft", JSON.stringify(payload));
      setStatus("draft");
    } catch (err) {
      console.error("Draft save failed", err);
      alert("Nije moguce sacuvati nacrt trenutno.");
    }
  };
  const priceItems = useMemo(() => {
    if (!parsedConfig) return [];
    return computePrice(parsedConfig, suits).items;
  }, [parsedConfig]);
  const fabricPrice = useMemo(() => {
    if (!parsedConfig) return 0;
    const fabric = fabricList.find((f: any) => String(f.id) === String(parsedConfig.colorId));
    return fabric?.price ?? 0;
  }, [fabricList, parsedConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || !phoneValid) {
      alert("Proverite email i telefon pre slanja.");
      return;
    }
    try {
      const existingRaw = localStorage.getItem("suitOrders");
      const parsed = existingRaw ? JSON.parse(existingRaw) : [];
      const measurementPayload = {
        height: h,
        weight: w,
        age,
        recommended: reco,
        values,
        mode: autoFill ? "auto" : "manual",
      };
      const payload = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        config: parsedConfig,
        measurements: measurementPayload,
        contact: { ime, email, telefon, napomena },
        savedAt: new Date().toISOString(),
      };
      parsed.unshift(payload);
      localStorage.setItem("suitOrders", JSON.stringify(parsed));

      if (parsedConfig) {
        const contactPayload = {
          ime,
          email,
          telefon,
          napomena,
          measurements: measurementPayload,
        };
        const apiPayload = {
          config: parsedConfig,
          price,
          fabricId: parsedConfig.colorId,
          contact: contactPayload,
          status: "pending",
        };
        const lastOrderId = localStorage.getItem("lastOrderId");

        try {
          let res: Response | null = null;
          if (lastOrderId) {
            res = await fetch(buildBackendUrl("orders"), {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: lastOrderId, ...apiPayload }),
            });
          }
          if (!res || !res.ok) {
            res = await fetch(buildBackendUrl("orders"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(apiPayload),
            });
          }
          const json = await res.json();
          if (!json?.success) {
            console.error("Order sync failed", json?.message);
          }
          if (json?.success) {
            localStorage.removeItem("lastOrderId");
          }
        } catch (err) {
          console.error("Order sync failed", err);
        }
      }

      setStatus("saved");
      localStorage.removeItem("suitMeasureDraft");
      alert("Porudzbina je sacuvana. Kontaktiracemo vas u najkracem roku.");
    } catch (err) {
      console.error("Saving order failed", err);
      alert("Trenutno nije moguce sacuvati porudzbinu. Pokusajte ponovo.");
    }
  };

  const fadeUp = {
    initial: { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="min-h-screen bg-[#f4efe8] text-[#1c1917]">
      <div className="relative overflow-hidden">
        <div className="absolute -top-48 right-[-140px] h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,206,160,0.45),_rgba(255,206,160,0))]" />
        <div className="absolute -left-24 top-40 h-[260px] w-[260px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(187,208,205,0.4),_rgba(187,208,205,0))]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <m.header {...fadeUp} className="mb-10 space-y-4">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/70 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#6f625b] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#ff7a00]" />
            Korak 2/3 · Mere
          </div>
          <h1 className="text-3xl font-semibold leading-tight text-[#1c1917] sm:text-4xl">
            Mere i porudzbina
          </h1>
          <p className="max-w-2xl text-sm text-[#5b514b]">
            Unesite osnovne podatke, proverite preporucene mere i potvrdite porudzbinu. Sve
            vrednosti su odmah vidljive i mozete ih rucno korigovati.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Dizajn", "Mere", "Porudzbina"].map((step, idx) => {
              const active = idx === 1;
              const done = idx === 0;
              return (
                <div
                  key={step}
                  className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] transition ${
                    active
                      ? "border-[#1c1917] bg-[#1c1917] text-white"
                      : done
                      ? "border-[#c7b8b0] bg-white text-[#6f625b]"
                      : "border-[#eadfd8] bg-white/80 text-[#9a8f88]"
                  }`}
                >
                  {step}
                </div>
              );
            })}
          </div>
        </m.header>

        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <m.section {...fadeUp} transition={{ duration: 0.6, delay: 0.05 }}>
              <div className="rounded-[32px] border border-[#eadfd8] bg-white/85 p-6 shadow-[0_25px_70px_rgba(20,15,12,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">
                      Osnovni podaci
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#1c1917]">
                      Visina, tezina, godine
                    </h2>
                  </div>
                  <div className="rounded-full border border-[#eadfd8] bg-[#fff8f2] px-4 py-2 text-xs text-[#7c6f66]">
                    Dinamicka preporuka
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetricSlider
                    label="Visina"
                    value={h}
                    onChange={(value) => setH(value)}
                    min={150}
                    max={210}
                    step={1}
                    unit="cm"
                    hint="Preporuka: stvarna visina bez obuce."
                  />
                  <MetricSlider
                    label="Tezina"
                    value={w}
                    onChange={(value) => setW(value)}
                    min={45}
                    max={140}
                    step={1}
                    unit="kg"
                    hint="Zeljena tezina ili trenutna."
                  />
                  <MetricSlider
                    label="Godine"
                    value={age}
                    onChange={(value) => setAge(value)}
                    min={16}
                    max={80}
                    step={1}
                    unit="god"
                    hint="Koristimo za blag fit korekciju."
                  />
                </div>
              </div>
            </m.section>

            <m.section {...fadeUp} transition={{ duration: 0.6, delay: 0.12 }}>
              <div className="rounded-[32px] border border-[#eadfd8] bg-white/90 p-6 shadow-[0_24px_60px_rgba(20,15,12,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">
                      Mere odela
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#1c1917]">
                      Preporuka + rucna korekcija
                    </h2>
                  </div>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoFill}
                        onChange={(event) => setAutoFill(event.target.checked)}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            color: "#1c1917",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#1c1917",
                          },
                        }}
                      />
                    }
                    label="Auto sync sa preporukom"
                    sx={{ "& .MuiFormControlLabel-label": { fontSize: "12px", color: "#6f625b" } }}
                  />
                </div>
                <p className="mt-3 text-sm text-[#6f625b]">
                  Preporuke se menjaju dok podesavate visinu, tezinu i godine. Ako znate svoje mere,
                  iskljucite auto sync i upisite tacne vrednosti.
                </p>

                {reco ? (
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {([
                      { key: "chest", label: "Grudi" },
                      { key: "waist", label: "Struk" },
                      { key: "hips", label: "Kukovi" },
                      { key: "shoulder", label: "Ramena" },
                      { key: "sleeve", label: "Rukav" },
                      { key: "inseam", label: "Unutrasnja noga" },
                    ] as const).map((item) => (
                      <MeasureField
                        key={item.key}
                        label={item.label}
                        unit="cm"
                        value={values[item.key]}
                        recommended={reco[item.key]}
                        onChange={(next) => {
                          setAutoFill(false);
                          setValues((prev) => ({ ...prev, [item.key]: Math.round(next) }));
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-[#7c716a]">Unesite osnovne podatke da dobijete preporuku.</p>
                )}
              </div>
            </m.section>

            <m.section {...fadeUp} transition={{ duration: 0.6, delay: 0.18 }}>
              <div className="rounded-[32px] border border-[#eadfd8] bg-white/95 p-6 shadow-[0_24px_60px_rgba(20,15,12,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">
                      Porudzbina
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-[#1c1917]">Kontakt podaci</h2>
                  </div>
                  <div className="rounded-full border border-[#eadfd8] bg-[#fff8f2] px-4 py-2 text-xs text-[#7c6f66]">
                    Odgovor u roku 24h
                  </div>
                </div>
                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextField
                      label="Ime i prezime"
                      value={ime}
                      onChange={(event) => setIme(event.target.value)}
                      required
                      fullWidth
                      sx={textFieldSx}
                    />
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                      fullWidth
                      error={!emailValid}
                      helperText={!emailValid ? "Neispravan email." : ""}
                      sx={textFieldSx}
                    />
                    <TextField
                      label="Telefon"
                      type="tel"
                      value={telefon}
                      onChange={(event) => setTelefon(event.target.value)}
                      placeholder="+381..."
                      required
                      fullWidth
                      error={!phoneValid}
                      helperText={!phoneValid ? "Unesite validan broj telefona." : ""}
                      sx={textFieldSx}
                    />
                    <TextField
                      label="Napomena"
                      value={napomena}
                      onChange={(event) => setNapomena(event.target.value)}
                      multiline
                      rows={2}
                      fullWidth
                      sx={textFieldSx}
                    />
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <button
                      type="button"
                      onClick={saveDraft}
                      className="w-full rounded-full border border-[#c7b8b0] bg-white px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#6f625b] transition hover:border-[#1c1917] hover:text-[#1c1917] md:w-auto"
                    >
                      Sacuvaj nacrt
                    </button>
                    <button
                      type="submit"
                      className="w-full rounded-full bg-[#1c1917] px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white transition hover:bg-[#0f0d0c] md:w-auto"
                    >
                      Posalji porudzbinu
                    </button>
                    {status === "saved" && (
                      <span className="text-sm font-semibold text-emerald-600">Sacuvano u lokalnu korpu.</span>
                    )}
                    {status === "draft" && (
                      <span className="text-sm font-semibold text-amber-600">Nacrt sacuvan lokalno.</span>
                    )}
                  </div>
                </form>
              </div>
            </m.section>
          </div>

          <div className="space-y-6">
            <m.section {...fadeUp} transition={{ duration: 0.6, delay: 0.1 }}>
              <div className="rounded-[32px] border border-[#eadfd8] bg-white/95 p-6 shadow-[0_24px_60px_rgba(20,15,12,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">Vas dizajn</p>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <h3 className="text-2xl font-semibold text-[#1c1917]">
                      {summary?.suitName || "Dizajn nije poslat"}
                    </h3>
                    <p className="text-sm text-[#7c716a]">{summary?.fabricName || "Izaberite tkaninu"}</p>
                  </div>
                  {price !== null && (
                    <div className="rounded-2xl border border-[#eadfd8] bg-[#fff8f2] px-4 py-2 text-center">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">Cena</p>
                      <p className="text-xl font-semibold text-[#1c1917]">{price} EUR</p>
                    </div>
                  )}
                </div>

                {summary ? (
                  <div className="mt-5 grid gap-3 text-sm text-[#5b514b]">
                    <div className="flex items-center justify-between rounded-2xl border border-[#f0e5df] bg-[#fffdfb] px-4 py-2">
                      <span>Rever</span>
                      <span className="font-semibold text-[#1c1917]">
                        {summary.lapel || "-"} {summary.lapelWidth ? `(${summary.lapelWidth})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#f0e5df] bg-[#fffdfb] px-4 py-2">
                      <span>Dzepovi</span>
                      <span className="font-semibold text-[#1c1917]">{summary.pocket || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#f0e5df] bg-[#fffdfb] px-4 py-2">
                      <span>Dzep na grudima</span>
                      <span className="font-semibold text-[#1c1917]">{summary.breastPocket || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#f0e5df] bg-[#fffdfb] px-4 py-2">
                      <span>Postava</span>
                      <span className="font-semibold text-[#1c1917]">{summary.interior || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between rounded-2xl border border-[#f0e5df] bg-[#fffdfb] px-4 py-2">
                      <span>Zavrsnica</span>
                      <span className="font-semibold text-[#1c1917]">{summary.cuff || "-"}</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-[#eadfd8] bg-[#fffdfb] p-4 text-sm text-[#7c716a]">
                    Dizajn nije poslat iz konfiguratora. Vratite se na dizajn i ponovo kliknite
                    &quot;Nastavi na merenje&quot;.
                  </div>
                )}

                {priceItems.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#eadfd8] bg-white/95 px-4 py-3 text-sm text-[#5b514b]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">
                      Pregled cene
                    </p>
                    <div className="mt-3 space-y-1">
                      {priceItems.map((item) => (
                        <div key={item.label} className="flex items-center justify-between text-sm">
                          <span>{item.label}</span>
                          <span className="font-semibold text-[#1c1917]">{item.price} EUR</span>
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between border-t border-[#eadfd8] pt-2 text-[12px] text-[#7c6f66]">
                        <span>Tkanina</span>
                        <span>{fabricPrice} EUR</span>
                      </div>
                      {price !== null && (
                        <div className="flex items-center justify-between text-base font-semibold text-[#1c1917]">
                          <span>Ukupno</span>
                          <span>{price} EUR</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = "/custom-suits";
                    }}
                    className="w-full rounded-full border border-[#1c1917] bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.35em] text-[#1c1917] transition hover:bg-[#1c1917] hover:text-white"
                  >
                    Povratak na dizajn
                  </button>
                </div>
              </div>
            </m.section>

            <m.section {...fadeUp} transition={{ duration: 0.6, delay: 0.14 }}>
              <div className="rounded-[32px] border border-[#eadfd8] bg-white/95 p-6 shadow-[0_20px_60px_rgba(20,15,12,0.08)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6f625b]">Fit vodič</p>
                <h3 className="mt-3 text-xl font-semibold text-[#1c1917]">Brze smernice</h3>
                <ul className="mt-4 space-y-3 text-sm text-[#5b514b]">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#1c1917]" />
                    Zategnite kroj do 1-2 cm manje od stvarne mere ako volite slim fit.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#1c1917]" />
                    Preporucujemo klasicnu duzinu rukava do baze palca.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-[#1c1917]" />
                    Ako niste sigurni, ostavite auto sync ukljucen pa korigujte 1-2 cm.
                  </li>
                </ul>
              </div>
            </m.section>

            <m.section {...fadeUp} transition={{ duration: 0.6, delay: 0.18 }}>
              <div className="rounded-[32px] border border-[#eadfd8] bg-[#101010] p-6 text-white shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">Sta sledi</p>
                <h3 className="mt-3 text-2xl font-semibold">Potvrda i merenje</h3>
                <ul className="mt-4 space-y-3 text-sm text-white/80">
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#ff7a00]" />
                    Potvrdjujemo porudzbinu i proveravamo mere.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#ff7a00]" />
                    Dogovaramo termin probnog merenja ili remote instrukcije.
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#ff7a00]" />
                    Finalni kroj i potvrda cene pre izrade.
                  </li>
                </ul>
              </div>
            </m.section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeasurePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f4efe8] px-4 py-10">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-[#eadfd8] bg-white/80 p-6 shadow-sm">
            <h1 className="text-2xl font-semibold text-[#1c1917]">Mere i porudzbina</h1>
            <p className="mt-2 text-sm text-[#6f625b]">Ucitavanje konfiguracije...</p>
          </div>
        </div>
      }
    >
      <MeasurePageContent />
    </Suspense>
  );
}
