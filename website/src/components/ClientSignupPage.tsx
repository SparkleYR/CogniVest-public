import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "motion/react";

const FIELDS = [
  { key: "name", label: "Full Name", type: "text", placeholder: "Madhav Kumar" },
  { key: "email", label: "Email Address", type: "email", placeholder: "you@example.com" },
  { key: "password", label: "Create Password", type: "password", placeholder: "Min. 8 characters" },
  { key: "age", label: "Age", type: "text", placeholder: "34" },
  { key: "income_net_worth", label: "Income / Net Worth", type: "text", placeholder: "₹3 crore annual income" },
  { key: "investment_goals", label: "Investment Goals", type: "text", placeholder: "Family security, retirement" },
  { key: "risk_tolerance", label: "Risk Tolerance", type: "select", options: ["Conservative", "Moderate", "Aggressive"] },
] as const;

const ClientSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUpClient, signIn } = useAuth();
  const [form, setForm] = useState<Record<string, string>>({
    name: "", email: "", password: "", age: "",
    income_net_worth: "", investment_goals: "", risk_tolerance: "Moderate",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Check for chatbot prefill data
  useEffect(() => {
    const stored = localStorage.getItem("chatbot_signup_data");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setForm((prev) => ({
          ...prev,
          name: data.name || prev.name,
          email: data.email || prev.email,
          age: data.age || prev.age,
          income_net_worth: data.income_net_worth || prev.income_net_worth,
          investment_goals: data.investment_goals || prev.investment_goals,
          risk_tolerance: data.risk_tolerance || prev.risk_tolerance,
        }));
        setPrefilled(true);
        localStorage.removeItem("chatbot_signup_data");
      } catch {}
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      await signUpClient({
        name: form.name,
        email: form.email,
        password: form.password,
        age: form.age,
        income_net_worth: form.income_net_worth,
        investment_goals: form.investment_goals,
        risk_tolerance: form.risk_tolerance,
      });
      // Auto-login after signup
      await signIn(form.email, form.password);
      navigate("/client/dashboard");
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg"
      >
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 mb-4">
              <img src="/cognivest-logo-monochrome.svg" alt="CogniVest" className="h-8 w-8 dark:invert" />
              <span className="text-xl font-bold tracking-tight text-foreground">CogniVest</span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Create Client Account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {prefilled
                ? "We've pre-filled your details from the chatbot — review and set a password."
                : "Start your personalized investment journey."}
            </p>
          </div>

          {/* Prefill banner */}
          {prefilled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Fields pre-filled from your chatbot conversation
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground text-sm outline-none focus:border-blue-500/50 transition-all appearance-none"
                  >
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    required={field.key !== "age"}
                    value={form[field.key]}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-secondary/50 text-foreground text-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold text-sm hover:from-blue-500 hover:to-cyan-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientSignupPage;
